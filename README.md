# apkpure

Search, get info, and download Android APKs from APKPure — one command, zero config.

```bash
npx apkpure search telegram
```

That's it. No install, no setup. Proxy auto-detected.

## Usage

### Search apps

```bash
npx apkpure search "whatsapp"
npx apkpure search "微信"
```

### Get app info

```bash
npx apkpure info com.whatsapp
npx apkpure info org.telegram.messenger
```

### Download APK

```bash
npx apkpure download com.whatsapp
npx apkpure download org.telegram.messenger -v 10.5.1
npx apkpure download com.whatsapp -o ~/Downloads
```

### List versions

```bash
npx apkpure versions org.telegram.messenger
```

### Trending

```bash
npx apkpure trending
```

## Options

```
-p, --proxy <url>      HTTP proxy (auto-detected if omitted)
-o, --output <dir>     Download directory (default: ./apks)
-v, --version <ver>    Download specific version
```

## Proxy

Auto-detected in order: `HTTPS_PROXY` env var → Clash config → port scan (7897, 7890, 1080...). Works behind GFW without any manual config.

Override if needed:

```bash
npx apkpure search telegram --proxy http://127.0.0.1:7897
```

## Install globally

```bash
npm install -g apkpure
apkpure search telegram
```

## License

MIT
