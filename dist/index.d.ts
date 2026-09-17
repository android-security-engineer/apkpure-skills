interface AppInfo {
    packageName: string;
    name: string;
    version: string;
    versionCode?: number;
    size?: number;
    iconUrl?: string;
    description?: string;
    developer?: string;
    rating?: string;
    category?: string;
}
interface AppDetail extends AppInfo {
    downloadUrl: string;
    fileType: "apk" | "xapk" | "apks";
    screenshots?: string[];
    updateDate?: string;
    requiresAndroid?: string;
    olderVersions?: AppVersion[];
    /**
     * CPU ABIs this asset supports. For fileType "apk" this is usually a
     * universal build covering every listed ABI in one file. For "xapk"/"apks"
     * it's a split bundle whose zip contains the matching per-ABI native libs —
     * there's no separate per-architecture download to choose from via this API.
     */
    nativeCode?: string[];
}
interface AppVersion {
    version: string;
    versionCode: number;
    downloadUrl: string;
    fileSize?: string;
    type: "apk" | "xapk" | "apks";
}
interface SearchResult {
    apps: AppInfo[];
    total?: number;
    page?: number;
}
interface DownloadOptions {
    outputDir: string;
    version?: string;
    fileName?: string;
    onProgress?: (downloaded: number, total: number) => void;
}
interface DownloadResult {
    filePath: string;
    packageName: string;
    version: string;
    fileType: string;
    fileSize: number;
    sha256: string;
}
interface TrendingApp {
    title: string;
    iconUrl: string;
    detailUrl: string;
}
interface SdkConfig {
    mode: "android" | "web" | "auto" | "api" | "scraping";
    locale?: string;
    timeout?: number;
    proxy?: string;
}
interface WorkflowStep {
    action: string;
    input: Record<string, unknown>;
    outputKey?: string;
}
interface WorkflowDefinition {
    name: string;
    description: string;
    steps: WorkflowStep[];
}
interface WorkflowResult {
    workflow: string;
    success: boolean;
    steps: {
        action: string;
        success: boolean;
        data?: unknown;
        error?: string;
    }[];
    output?: unknown;
    error?: string;
}

interface ServerEvent {
    type: "connected" | "state:updated" | "download:progress" | "action:start" | "action:complete" | "action:error";
    payload?: unknown;
}
declare class ApkPureServer {
    private port;
    private sseClients;
    private state;
    constructor(port?: number);
    private broadcast;
    private patchState;
    private cors;
    private json;
    private readBody;
    private handleAction;
    private handleEvents;
    private serveGui;
    start(): Promise<void>;
}
declare function startServer(port?: number): Promise<void>;

declare class ApkPure {
    private config;
    private mobile;
    private scraper;
    private _initPromise;
    constructor(config?: Partial<SdkConfig>);
    private _init;
    private ensureReady;
    search(query: string, page?: number): Promise<SearchResult>;
    getInfo(packageName: string): Promise<AppDetail | null>;
    getVersions(packageName: string): Promise<AppVersion[]>;
    download(packageName: string, options: DownloadOptions): Promise<DownloadResult>;
    trending(): Promise<TrendingApp[]>;
}

interface SkillRequest {
    action: "search" | "info" | "download" | "trending" | "versions" | "workflow" | "list-workflows";
    query?: string;
    package?: string;
    outputDir?: string;
    version?: string;
    mode?: "android" | "web" | "auto" | "api" | "scraping";
    proxy?: string;
    workflow?: string;
    params?: Record<string, unknown>;
}
interface SkillResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}
interface SkillCallbacks {
    onProgress?: (downloaded: number, total: number) => void;
}
declare function handleSkillRequest(req: SkillRequest, callbacks?: SkillCallbacks): Promise<SkillResponse>;

type StepContext = Record<string, unknown>;
declare function runWorkflow(workflowName: string, params: StepContext, options?: {
    mode?: "android" | "web" | "auto" | "api" | "scraping";
    proxy?: string;
    outputDir?: string;
}): Promise<WorkflowResult>;
declare function listWorkflows(): WorkflowDefinition[];

export { ApkPure, ApkPureServer, type AppDetail, type AppInfo, type AppVersion, type DownloadOptions, type DownloadResult, type SdkConfig, type SearchResult, type ServerEvent, type SkillCallbacks, type SkillRequest, type SkillResponse, type TrendingApp, type WorkflowDefinition, type WorkflowResult, type WorkflowStep, handleSkillRequest, listWorkflows, runWorkflow, startServer };
