/**
 * HTTP API server — GUI control mode.
 *
 * Two agent interaction patterns:
 *   Headless:    import { handleSkillRequest } from "apkpure"  →  direct SDK call
 *   GUI control: POST http://localhost:<port>/api/action       →  same logic, GUI updates live
 *
 * The server maintains a shared state (search results, current app, download progress,
 * history) that is pushed to all connected GUIs via SSE whenever it changes.
 * Both humans (clicking in the browser) and Agents (calling /api/action) drive the
 * exact same state machine — neither has a "privileged" path.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleSkillRequest } from "./skill-handler.js";
import type { SkillRequest, SkillResponse } from "./skill-handler.js";
import type { AppInfo, AppDetail, AppVersion, DownloadResult, TrendingApp } from "./types/index.js";
import { DEFAULT_DOWNLOAD_DIR } from "./config.js";

// ─── Shared UI state ──────────────────────────────────────────────────────────

export interface DownloadRecord extends DownloadResult {
  timestamp: number;
  appName?: string;
}

export interface ServerState {
  lastQuery: string;
  searchResults: AppInfo[];
  trendingApps: TrendingApp[];
  selectedPackage: string;
  selectedDetail: AppDetail | null;
  selectedVersions: AppVersion[];
  downloadProgress: { packageName: string; downloaded: number; total: number; percent: number } | null;
  history: DownloadRecord[];
  error: string;
  activeAction: string;  // "" when idle; action name while busy
}

export interface ServerEvent {
  type:
    | "connected"
    | "state:updated"
    | "download:progress"
    | "action:start"
    | "action:complete"
    | "action:error";
  payload?: unknown;
}

// ─── API schema (for Agent discoverability) ───────────────────────────────────

const API_SCHEMA = {
  version: "1",
  endpoints: [
    { method: "POST", path: "/api/action", description: "Execute an action; body is SkillRequest JSON" },
    { method: "GET",  path: "/api/state",  description: "Full current UI state snapshot" },
    { method: "GET",  path: "/api/status", description: "Health check; returns port, clients, defaultDir" },
    { method: "GET",  path: "/api/events", description: "SSE stream of state/progress events" },
    { method: "GET",  path: "/api/schema", description: "This schema document" },
  ],
  actions: [
    { action: "search",         required: ["query"],    optional: [],                    description: "Search apps by keyword; results appear in state.searchResults" },
    { action: "info",           required: ["package"],  optional: [],                    description: "Get app detail; result appears in state.selectedDetail" },
    { action: "versions",       required: ["package"],  optional: [],                    description: "List all versions; result appears in state.selectedVersions" },
    { action: "trending",       required: [],           optional: [],                    description: "Get trending apps; result appears in state.trendingApps" },
    { action: "download",       required: ["package"],  optional: ["outputDir","version"], description: "Download APK/XAPK; progress via SSE download:progress events" },
    { action: "workflow",       required: ["workflow"], optional: ["params"],             description: "Run a named workflow" },
    { action: "list-workflows", required: [],           optional: [],                    description: "List all available workflows" },
  ],
  events: [
    { type: "connected",        description: "Fired on SSE connect; payload is full ServerState" },
    { type: "state:updated",    description: "Fired after any action; payload is full ServerState" },
    { type: "download:progress",description: "Fired during download; payload: {packageName,downloaded,total,percent}" },
    { type: "action:start",     description: "Fired when an action begins; payload: {action}" },
    { type: "action:complete",  description: "Fired when an action finishes; payload: {action,result}" },
    { type: "action:error",     description: "Fired on action failure; payload: {action,error}" },
  ],
};

// ─── Server class ─────────────────────────────────────────────────────────────

export class ApkPureServer {
  private port: number;
  private sseClients: ServerResponse[] = [];
  private state: ServerState = {
    lastQuery: "",
    searchResults: [],
    trendingApps: [],
    selectedPackage: "",
    selectedDetail: null,
    selectedVersions: [],
    downloadProgress: null,
    history: [],
    error: "",
    activeAction: "",
  };

  constructor(port = 13456) {
    this.port = port;
  }

  // ── SSE broadcast ──────────────────────────────────────────────────────────

  private broadcast(event: ServerEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.sseClients = this.sseClients.filter((res) => {
      try { res.write(data); return true; } catch { return false; }
    });
  }

  private patchState(partial: Partial<ServerState>): void {
    Object.assign(this.state, partial);
    this.broadcast({ type: "state:updated", payload: this.state });
  }

  // ── HTTP helpers ───────────────────────────────────────────────────────────

  private cors(res: ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    this.cors(res);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }

  // ── Action handler (core logic) ────────────────────────────────────────────

  private async handleAction(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: string;
    try { body = await this.readBody(req); }
    catch { this.json(res, 400, { success: false, error: "failed to read request body" }); return; }

    let skillReq: SkillRequest;
    try { skillReq = JSON.parse(body) as SkillRequest; }
    catch { this.json(res, 400, { success: false, error: "invalid JSON body" }); return; }

    this.patchState({ error: "", activeAction: skillReq.action });
    this.broadcast({ type: "action:start", payload: { action: skillReq.action } });

    // Inject progress callback for downloads
    const callbacks = skillReq.action === "download"
      ? {
          onProgress: (downloaded: number, total: number) => {
            const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            const progress = { packageName: skillReq.package ?? "", downloaded, total, percent };
            this.state.downloadProgress = progress;
            this.broadcast({ type: "download:progress", payload: progress });
          },
        }
      : {};

    let result: SkillResponse;
    try { result = await handleSkillRequest(skillReq, callbacks); }
    catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.patchState({ error, downloadProgress: null, activeAction: "" });
      this.broadcast({ type: "action:error", payload: { action: skillReq.action, error } });
      this.json(res, 500, { success: false, error });
      return;
    }

    // Update shared UI state based on what action completed
    if (result.success) {
      if (skillReq.action === "search") {
        const data = result.data as { apps: AppInfo[] };
        this.patchState({
          lastQuery: skillReq.query ?? "",
          searchResults: data?.apps ?? [],
          trendingApps: [],
          selectedPackage: "", selectedDetail: null, selectedVersions: [],
          activeAction: "",
        });
      } else if (skillReq.action === "trending") {
        this.patchState({
          trendingApps: result.data as TrendingApp[],
          searchResults: [],
          lastQuery: "",
          activeAction: "",
        });
      } else if (skillReq.action === "info") {
        this.patchState({ selectedPackage: skillReq.package ?? "", selectedDetail: result.data as AppDetail, activeAction: "" });
      } else if (skillReq.action === "versions") {
        this.patchState({ selectedVersions: result.data as AppVersion[], activeAction: "" });
      } else if (skillReq.action === "download") {
        const dl = result.data as DownloadResult;
        const record: DownloadRecord = {
          ...dl,
          timestamp: Date.now(),
          appName: this.state.selectedDetail?.name ?? dl.packageName,
        };
        this.patchState({
          downloadProgress: null,
          history: [record, ...this.state.history].slice(0, 50),
          activeAction: "",
        });
      } else {
        this.patchState({ activeAction: "" });
      }
    } else {
      this.patchState({ error: result.error ?? "unknown error", downloadProgress: null, activeAction: "" });
    }

    this.broadcast({ type: "action:complete", payload: { action: skillReq.action, result } });
    this.json(res, result.success ? 200 : 422, result);
  }

  // ── SSE endpoint ───────────────────────────────────────────────────────────

  private handleEvents(res: ServerResponse): void {
    this.cors(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    // Send current state immediately so new GUIs sync without a second request.
    res.write(`data: ${JSON.stringify({ type: "connected", payload: this.state })}\n\n`);
    this.sseClients.push(res);
    res.on("close", () => { this.sseClients = this.sseClients.filter((c) => c !== res); });
  }

  // ── Static GUI ─────────────────────────────────────────────────────────────

  private serveGui(res: ServerResponse): void {
    this.cors(res);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(GUI_HTML);
  }

  // ── Server start ───────────────────────────────────────────────────────────

  start(): Promise<void> {
    return new Promise((resolve) => {
      const server = createServer(async (req, res) => {
        const url = req.url ?? "/";
        const method = req.method ?? "GET";

        if (method === "OPTIONS") { this.cors(res); res.writeHead(204); res.end(); return; }

        if ((url === "/" || url === "/gui") && method === "GET") { this.serveGui(res); return; }
        if (url === "/api/status" && method === "GET") {
          this.json(res, 200, { ok: true, port: this.port, clients: this.sseClients.length, defaultDir: DEFAULT_DOWNLOAD_DIR });
          return;
        }
        if (url === "/api/state"  && method === "GET") { this.json(res, 200, this.state); return; }
        if (url === "/api/schema" && method === "GET") { this.json(res, 200, API_SCHEMA); return; }
        if (url === "/api/events" && method === "GET") { this.handleEvents(res); return; }
        if (url === "/api/action" && method === "POST") { await this.handleAction(req, res); return; }

        this.json(res, 404, { error: "not found" });
      });

      server.listen(this.port, "127.0.0.1", () => resolve());
    });
  }
}

export async function startServer(port?: number): Promise<void> {
  const srv = new ApkPureServer(port);
  await srv.start();
  const p = port ?? 13456;
  console.log(`APKPure GUI server  →  http://127.0.0.1:${p}`);
  console.log();
  console.log(`GUI (browser):        http://127.0.0.1:${p}/`);
  console.log("Agent API:");
  console.log(`  POST http://127.0.0.1:${p}/api/action   (SkillRequest JSON)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/events   (SSE — state updates)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/state    (current UI state snapshot)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/status   (health check)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/schema   (available actions & event types)`);
}

// ─── Embedded GUI ─────────────────────────────────────────────────────────────
// Self-contained single-page app. Humans click; Agents POST to /api/action.
// Both drive the same state machine.

const GUI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>APKPure</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0f1117;--surface:#1a1d27;--surface2:#22263a;--border:#2d3250;
  --accent:#4f8ef7;--accent2:#7c5cff;--text:#e2e8f0;--muted:#8892a4;
  --green:#34d399;--red:#f87171;--yellow:#fbbf24;--orange:#fb923c;
  --radius:10px;--font:'Inter',system-ui,sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--font);
  display:grid;grid-template-columns:340px 1fr;grid-template-rows:56px 1fr;
  height:100vh;overflow:hidden}
/* Header */
header{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 20px;gap:12px}
header h1{font-size:17px;font-weight:700;letter-spacing:-.3px}
header h1 span{color:var(--accent)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--muted);flex-shrink:0}
.dot.live{background:var(--green);box-shadow:0 0 6px var(--green)}
#conn-label{font-size:12px;color:var(--muted)}
/* Agent activity badge */
#agent-badge{display:none;align-items:center;gap:6px;background:rgba(251,146,60,.12);
  border:1px solid rgba(251,146,60,.35);border-radius:20px;padding:3px 10px;
  font-size:12px;color:var(--orange);margin-left:4px}
#agent-badge.show{display:flex}
.spinner{width:10px;height:10px;border:2px solid rgba(251,146,60,.3);
  border-top-color:var(--orange);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
/* Left panel */
#left{background:var(--surface);border-right:1px solid var(--border);
  display:flex;flex-direction:column;overflow:hidden}
/* Tabs */
.tabs{display:flex;border-bottom:1px solid var(--border)}
.tab{flex:1;padding:10px;font-size:12px;font-weight:600;text-align:center;
  cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;
  text-transform:uppercase;letter-spacing:.5px;transition:color .15s,border-color .15s}
.tab:hover{color:var(--text)}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}
#search-bar{padding:10px;border-bottom:1px solid var(--border);display:flex;gap:8px}
#q{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  padding:8px 12px;color:var(--text);font-size:14px;outline:none}
#q:focus{border-color:var(--accent)}
#search-btn{background:var(--accent);border:none;border-radius:8px;padding:8px 14px;
  color:#fff;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
#search-btn:hover{opacity:.88}
#results{flex:1;overflow-y:auto;padding:8px}
.app-card{padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .15s;
  display:flex;align-items:center;gap:10px}
.app-card:hover{background:var(--surface2)}
.app-card.selected{background:var(--surface2);border-left:3px solid var(--accent)}
.app-icon{width:40px;height:40px;border-radius:8px;object-fit:cover;background:var(--surface2);flex-shrink:0}
.app-icon-placeholder{width:40px;height:40px;border-radius:8px;background:var(--surface2);
  display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:18px;flex-shrink:0}
.app-meta{min-width:0}
.app-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-pkg{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-ver{font-size:11px;color:var(--accent)}
.empty{padding:32px;text-align:center;color:var(--muted);font-size:13px}
/* Trending panel */
#trending-panel{flex:1;overflow-y:auto;padding:8px;display:none}
#trending-panel.show{display:block}
.trending-load-btn{width:100%;background:var(--surface2);border:1px solid var(--border);
  border-radius:8px;padding:10px;color:var(--text);font-size:13px;cursor:pointer;
  font-weight:600;margin-bottom:8px}
.trending-load-btn:hover{border-color:var(--accent);color:var(--accent)}
.trend-card{padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .15s;
  display:flex;align-items:center;gap:10px}
.trend-card:hover{background:var(--surface2)}
.trend-title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trend-hint{font-size:11px;color:var(--muted);margin-top:2px}
/* Right panel */
#right{display:flex;flex-direction:column;overflow:hidden}
#detail{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:20px}
.placeholder{display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:14px}
.detail-header{display:flex;gap:16px;align-items:flex-start}
.detail-icon{width:72px;height:72px;border-radius:14px;object-fit:cover;background:var(--surface2);flex-shrink:0}
.detail-icon-placeholder{width:72px;height:72px;border-radius:14px;background:var(--surface2);
  display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:32px;flex-shrink:0}
.detail-title{font-size:20px;font-weight:700}
.detail-pkg{font-size:12px;color:var(--muted);margin-top:2px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.tag{background:var(--surface2);border:1px solid var(--border);border-radius:20px;
  padding:2px 10px;font-size:11px;color:var(--muted)}
.tag.type{border-color:var(--accent2);color:var(--accent2)}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.meta-item{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px}
.meta-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.meta-value{font-size:14px;font-weight:600;margin-top:4px}
.desc{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;
  font-size:13px;line-height:1.6;color:var(--muted)}
.dl-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.dl-section h3{font-size:13px;font-weight:600;margin-bottom:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.dl-row{display:flex;gap:8px;align-items:center}
#out-dir{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  padding:8px 10px;color:var(--text);font-size:12px;outline:none}
#out-dir:focus{border-color:var(--accent)}
#dl-btn{background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;
  border-radius:8px;padding:9px 20px;color:#fff;font-size:13px;font-weight:700;
  cursor:pointer;white-space:nowrap}
#dl-btn:hover{opacity:.9}
#dl-btn:disabled{opacity:.4;cursor:not-allowed}
/* Progress */
#progress-wrap{display:none;margin-top:12px}
#progress-wrap.show{display:block}
.progress-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:flex;justify-content:space-between}
.progress-bar-bg{background:var(--surface2);border-radius:99px;height:6px;overflow:hidden}
.progress-bar-fill{background:linear-gradient(90deg,var(--accent),var(--accent2));
  height:100%;border-radius:99px;transition:width .3s}
/* Versions */
.ver-list{display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto}
.ver-item{display:flex;align-items:center;justify-content:space-between;
  padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .15s;
  border:1px solid transparent}
.ver-item:hover{background:var(--surface2);border-color:var(--border)}
.ver-item.latest::after{content:'latest';font-size:10px;background:var(--green);
  color:#000;padding:1px 6px;border-radius:99px;font-weight:700}
.ver-name{font-size:13px;font-weight:600}
.ver-type{font-size:11px;color:var(--accent2)}
/* History */
#history-wrap{border-top:1px solid var(--border);padding:14px 24px;background:var(--surface);
  max-height:220px;overflow-y:auto}
#history-wrap h3{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.hist-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)}
.hist-item:last-child{border-bottom:none}
.hist-name{font-size:13px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hist-ver{font-size:11px;color:var(--muted)}
.hist-size{font-size:11px;color:var(--accent);white-space:nowrap}
.hist-copy{background:none;border:1px solid var(--border);border-radius:6px;
  padding:2px 8px;font-size:11px;color:var(--muted);cursor:pointer}
.hist-copy:hover{border-color:var(--accent);color:var(--accent)}
/* Error toast */
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
  background:#2a1020;border:1px solid var(--red);color:var(--red);
  padding:10px 18px;border-radius:8px;font-size:13px;display:none;z-index:100;
  max-width:420px;text-align:center}
#toast.show{display:block}
/* Scrollbar */
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
</style>
</head>
<body>
<header>
  <h1>APK<span>Pure</span></h1>
  <div class="dot" id="dot"></div>
  <span id="conn-label">connecting…</span>
  <div id="agent-badge">
    <div class="spinner"></div>
    <span id="agent-label">Agent working…</span>
  </div>
</header>

<div id="left">
  <div class="tabs">
    <div class="tab active" id="tab-search" onclick="switchTab('search')">Search</div>
    <div class="tab" id="tab-trending" onclick="switchTab('trending')">Trending</div>
  </div>
  <div id="search-bar">
    <input id="q" type="text" placeholder="Search apps…" autocomplete="off">
    <button id="search-btn">Search</button>
  </div>
  <div id="results"><div class="empty">Search for an app to get started.</div></div>
  <div id="trending-panel">
    <button class="trending-load-btn" onclick="loadTrending()">Load trending apps</button>
    <div id="trend-list"></div>
  </div>
</div>

<div id="right">
  <div id="detail"><div class="placeholder">Select an app from the search results.</div></div>
  <div id="history-wrap" style="display:none">
    <h3>Download History</h3>
    <div id="hist-list"></div>
  </div>
</div>

<div id="toast"></div>

<script>
const API = '';  // same origin

// ── State ──────────────────────────────────────────────────────────────────

let state = {
  lastQuery:'', searchResults:[], trendingApps:[],
  selectedPackage:'', selectedDetail:null, selectedVersions:[],
  downloadProgress:null, history:[], error:'', activeAction:''
};
let selectedVersion = null;
let activeTab = 'search';

// ── SSE connection ────────────────────────────────────────────────────────

function connect() {
  const es = new EventSource(API + '/api/events');
  const dot = document.getElementById('dot');
  const lbl = document.getElementById('conn-label');

  es.onopen = () => { dot.className='dot live'; lbl.textContent='live'; };
  es.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    if (ev.type === 'connected' || ev.type === 'state:updated') {
      state = ev.payload;
      render();
    } else if (ev.type === 'download:progress') {
      state.downloadProgress = ev.payload;
      renderProgress();
    } else if (ev.type === 'action:start') {
      updateAgentBadge(ev.payload.action);
    } else if (ev.type === 'action:complete' || ev.type === 'action:error') {
      updateAgentBadge('');
      if (ev.type === 'action:error') showToast(ev.payload.error || 'Unknown error');
    }
  };
  es.onerror = () => {
    dot.className='dot'; lbl.textContent='reconnecting…';
    es.close();
    setTimeout(connect, 2000);
  };
}

// ── Agent badge ────────────────────────────────────────────────────────────

function updateAgentBadge(action) {
  const badge = document.getElementById('agent-badge');
  const label = document.getElementById('agent-label');
  if (action) {
    label.textContent = 'Agent: ' + action + '…';
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

// ── Tab switcher ───────────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-search').classList.toggle('active', tab === 'search');
  document.getElementById('tab-trending').classList.toggle('active', tab === 'trending');
  document.getElementById('search-bar').style.display = tab === 'search' ? 'flex' : 'none';
  document.getElementById('results').style.display = tab === 'search' ? 'block' : 'none';
  document.getElementById('trending-panel').classList.toggle('show', tab === 'trending');
  if (tab === 'trending' && !state.trendingApps.length) {
    document.getElementById('trend-list').innerHTML = '';
  } else if (tab === 'trending') {
    renderTrending();
  }
}

// ── Render ─────────────────────────────────────────────────────────────────

function render() {
  renderResults();
  renderDetail();
  renderHistory();
  renderTrending();
  updateAgentBadge(state.activeAction || '');
  // Auto-switch to trending tab if trending results arrived and we're on search with nothing
  if (state.trendingApps.length && !state.searchResults.length && activeTab === 'search') {
    switchTab('trending');
  }
  if (!state.downloadProgress) renderProgress();
}

function renderResults() {
  const el = document.getElementById('results');
  if (!state.searchResults.length) {
    el.innerHTML = '<div class="empty">' + (state.lastQuery ? 'No results.' : 'Search for an app to get started.') + '</div>';
    return;
  }
  el.innerHTML = state.searchResults.map(app => \`
    <div class="app-card\${app.packageName===state.selectedPackage?' selected':''}"
         onclick="selectApp('\${escAttr(app.packageName)}')">
      \${app.iconUrl
        ? '<img class="app-icon" src="'+escAttr(app.iconUrl)+'" onerror="this.style.display=\'none\'">'
        : '<div class="app-icon-placeholder">📦</div>'}
      <div class="app-meta">
        <div class="app-name">\${escHtml(app.name)}</div>
        <div class="app-pkg">\${escHtml(app.packageName)}</div>
        \${app.version ? '<div class="app-ver">v'+escHtml(app.version)+'</div>' : ''}
      </div>
    </div>
  \`).join('');
}

function renderTrending() {
  const list = document.getElementById('trend-list');
  if (!list) return;
  if (!state.trendingApps.length) return;
  list.innerHTML = state.trendingApps.map(app => \`
    <div class="trend-card" onclick="searchByTitle('\${escAttr(app.title)}')">
      \${app.iconUrl
        ? '<img class="app-icon" src="'+escAttr(app.iconUrl)+'" onerror="this.style.display=\'none\'">'
        : '<div class="app-icon-placeholder">🔥</div>'}
      <div class="app-meta">
        <div class="trend-title">\${escHtml(app.title)}</div>
        <div class="trend-hint">Click to search</div>
      </div>
    </div>
  \`).join('');
  // Hide the "load" button once results are showing
  const loadBtn = document.querySelector('.trending-load-btn');
  if (loadBtn) loadBtn.style.display = 'none';
}

function renderDetail() {
  const el = document.getElementById('detail');
  const d = state.selectedDetail;
  if (!d) {
    el.innerHTML = '<div class="placeholder">Select an app from the search results.</div>';
    return;
  }
  const versions = state.selectedVersions;
  el.innerHTML = \`
    <div class="detail-header">
      \${d.iconUrl
        ? '<img class="detail-icon" src="'+escAttr(d.iconUrl)+'">'
        : '<div class="detail-icon-placeholder">📦</div>'}
      <div>
        <div class="detail-title">\${escHtml(d.name)}</div>
        <div class="detail-pkg">\${escHtml(d.packageName)}</div>
        <div class="tags">
          \${d.fileType ? '<span class="tag type">'+d.fileType.toUpperCase()+'</span>' : ''}
          \${d.category ? '<span class="tag">'+escHtml(d.category)+'</span>' : ''}
          \${d.rating ? '<span class="tag">⭐ '+escHtml(d.rating)+'</span>' : ''}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">Version</div><div class="meta-value">\${escHtml(d.version||'—')}</div></div>
      <div class="meta-item"><div class="meta-label">Developer</div><div class="meta-value">\${escHtml(d.developer||'—')}</div></div>
      <div class="meta-item"><div class="meta-label">Updated</div><div class="meta-value">\${escHtml(d.updateDate||'—')}</div></div>
      <div class="meta-item"><div class="meta-label">Requires Android</div><div class="meta-value">\${escHtml(d.requiresAndroid||'—')}</div></div>
    </div>

    \${d.description ? '<div class="desc">'+escHtml(d.description.slice(0,400))+(d.description.length>400?'…':'')+'</div>' : ''}

    <div class="dl-section">
      <h3>Download</h3>
      <div class="dl-row">
        <input id="out-dir" type="text" value="\${escAttr(window._defaultDir||'')}" placeholder="Output directory…">
        <button id="dl-btn" onclick="download()">⬇ Download</button>
      </div>
      <div id="progress-wrap">
        <div class="progress-label">
          <span id="prog-label">Downloading…</span>
          <span id="prog-pct">0%</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" id="prog-fill" style="width:0%"></div></div>
      </div>
    </div>

    \${versions.length > 0 ? \`
    <div class="dl-section">
      <h3>All Versions (\${versions.length})</h3>
      <div class="ver-list">
        \${versions.map((v,i)=>\`
          <div class="ver-item\${i===0?' latest':''}" onclick="selectVersion('\${escAttr(v.version)}','\${escAttr(String(v.versionCode))}')">
            <div>
              <div class="ver-name">\${escHtml(v.version)}</div>
              <div class="ver-type">\${v.type?.toUpperCase()||'APK'}</div>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>
    \` : \`<button onclick="loadVersions()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 16px;color:var(--text);cursor:pointer;font-size:13px">Load all versions</button>\`}
  \`;
  // Restore output dir
  const outDir = document.getElementById('out-dir');
  if (outDir && window._defaultDir) outDir.value = window._defaultDir;
}

function renderProgress() {
  const wrap = document.getElementById('progress-wrap');
  if (!wrap) return;
  const p = state.downloadProgress;
  const btn = document.getElementById('dl-btn');
  if (!p || p.total === 0) {
    wrap.classList.remove('show');
    if (btn) { btn.disabled = false; btn.textContent = '⬇ Download'; }
    return;
  }
  wrap.classList.add('show');
  document.getElementById('prog-pct').textContent = p.percent + '%';
  document.getElementById('prog-fill').style.width = p.percent + '%';
  const mb = (p.downloaded/1024/1024).toFixed(1);
  const tot = (p.total/1024/1024).toFixed(1);
  document.getElementById('prog-label').textContent = mb + ' / ' + tot + ' MB';
  if (btn) btn.disabled = true;
}

function renderHistory() {
  const items = state.history;
  const wrap = document.getElementById('history-wrap');
  const list = document.getElementById('hist-list');
  if (!items?.length) { wrap.style.display='none'; return; }
  wrap.style.display='block';
  list.innerHTML = items.map(r => \`
    <div class="hist-item">
      <div class="hist-name">\${escHtml(r.appName||r.packageName)}</div>
      <span class="hist-ver">\${escHtml(r.version)}</span>
      <span class="hist-size">\${(r.fileSize/1024/1024).toFixed(1)} MB</span>
      <button class="hist-copy" onclick="copyPath('\${escAttr(r.filePath)}')">Copy path</button>
    </div>
  \`).join('');
}

// ── Actions ────────────────────────────────────────────────────────────────

async function post(body) {
  const r = await fetch(API + '/api/action', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return r.json();
}

async function search() {
  const q = document.getElementById('q').value.trim();
  if (!q) return;
  document.getElementById('search-btn').textContent = '…';
  await post({ action:'search', query:q });
  document.getElementById('search-btn').textContent = 'Search';
}

async function selectApp(pkg) {
  selectedVersion = null;
  await post({ action:'info', package:pkg });
}

async function loadVersions() {
  if (!state.selectedPackage) return;
  await post({ action:'versions', package:state.selectedPackage });
}

async function loadTrending() {
  const btn = document.querySelector('.trending-load-btn');
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  await post({ action:'trending' });
  if (btn) { btn.textContent = 'Refresh'; btn.disabled = false; }
}

async function searchByTitle(title) {
  // Switch to search tab and search by title
  switchTab('search');
  document.getElementById('q').value = title;
  document.getElementById('search-btn').textContent = '…';
  await post({ action:'search', query:title });
  document.getElementById('search-btn').textContent = 'Search';
}

async function selectVersion(ver, code) {
  selectedVersion = { version:ver, code };
  document.querySelectorAll('.ver-item').forEach(el => el.style.borderColor='');
  event.currentTarget.style.borderColor = 'var(--accent)';
}

async function download() {
  const pkg = state.selectedPackage;
  if (!pkg) return;
  const dir = document.getElementById('out-dir').value.trim();
  const btn = document.getElementById('dl-btn');
  btn.disabled = true;
  btn.textContent = 'Downloading…';
  const body = { action:'download', package:pkg, outputDir:dir||undefined };
  if (selectedVersion) body.version = selectedVersion.version;
  const r = await post(body);
  // Button re-enable is handled by renderProgress() when downloadProgress clears.
  // Only re-enable immediately if download failed (no progress events fired).
  if (!r.success) {
    btn.disabled = false;
    btn.textContent = '⬇ Download';
    showToast(r.error || 'Download failed');
  }
}

function copyPath(path) {
  navigator.clipboard.writeText(path).catch(()=>{});
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 4000);
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Key bindings ───────────────────────────────────────────────────────────

document.getElementById('q').addEventListener('keydown', e => { if (e.key==='Enter') search(); });
document.getElementById('search-btn').addEventListener('click', search);

// ── Fetch default download dir from status ─────────────────────────────────
fetch(API+'/api/status').then(r=>r.json()).then(s=>{
  window._defaultDir = s.defaultDir || '';
  const outDir = document.getElementById('out-dir');
  if (outDir && s.defaultDir) outDir.value = s.defaultDir;
}).catch(()=>{});

// ── Boot ───────────────────────────────────────────────────────────────────
connect();
</script>
</body>
</html>`;
