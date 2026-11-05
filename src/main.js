const path = require("path");
const { app, BrowserWindow, Menu, Tray, ipcMain, session, nativeImage } = require("electron");
const { fromNativeImage, toNativeImage, withActivity } = require("./badge");
const { pageHook } = require("./page-hook");

const TEAMS_URL = "https://teams.live.com/v2/";
const ICON_PATH = path.join(__dirname, "../assets/teams.png");

let mainWindow = null;
let tray = null;
let quitting = false;
let bases = null;
let activity = { messages: 0, incomingCall: false };

function chromeUserAgent() {
  const version = process.versions.chrome || "130.0.0.0";
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

function loadBases() {
  const source = nativeImage.createFromPath(ICON_PATH);
  if (source.isEmpty()) throw new Error("assets/teams.png is not a readable icon");
  return {
    window: fromNativeImage(source.resize({ width: 256, height: 256, quality: "best" })),
    tray: fromNativeImage(source.resize({ width: 128, height: 128, quality: "best" })),
  };
}

function renderActivity() {
  if (!bases) return;
  const windowImage = toNativeImage(nativeImage, withActivity(bases.window, activity.messages, activity.incomingCall));
  const trayImage = toNativeImage(nativeImage, withActivity(bases.tray, activity.messages, activity.incomingCall));
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setIcon(windowImage);
  if (tray && !tray.isDestroyed()) tray.setImage(trayImage);
  const badge = activity.messages > 0 ? activity.messages : activity.incomingCall ? 1 : 0;
  try {
    app.setBadgeCount(badge);
  } catch (_) {}
}

function rememberActivity(messages, incomingCall) {
  const count = Number.isFinite(messages) ? Math.max(0, Math.min(999, Math.floor(messages))) : 0;
  const call = Boolean(incomingCall);
  if (count === activity.messages && call === activity.incomingCall) return;
  activity = { messages: count, incomingCall: call };
  renderActivity();
}

function showMain() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function installPageHook(contents) {
  const code = pageHook(process.versions.chrome || "0");
  contents.executeJavaScript(code).catch(() => {});
}

function chromeMajor() {
  return String(process.versions.chrome || "0").split(".")[0];
}

function withGoogleChromeBrand(header, version) {
  const cleaned = String(header || "")
    .replace(/,?\s*"Electron";v="[^"]*"/gi, "")
    .replace(/^,\s*/, "")
    .trim();
  if (/Google Chrome/i.test(cleaned)) return cleaned;
  const brand = `"Google Chrome";v="${version}"`;
  return cleaned ? `${cleaned}, ${brand}` : brand;
}

function allowPermissions() {
  const partition = session.defaultSession;
  const major = chromeMajor();
  const full = process.versions.chrome || `${major}.0.0.0`;
  partition.webRequest.onBeforeSendHeaders({ urls: ["*://*/*"] }, (details, callback) => {
    const headers = details.requestHeaders;
    const lowKey = Object.keys(headers).find((key) => key.toLowerCase() === "sec-ch-ua");
    const fullKey = Object.keys(headers).find((key) => key.toLowerCase() === "sec-ch-ua-full-version-list");
    headers[lowKey || "Sec-CH-UA"] = withGoogleChromeBrand(lowKey ? headers[lowKey] : "", major);
    headers[fullKey || "Sec-CH-UA-Full-Version-List"] = withGoogleChromeBrand(fullKey ? headers[fullKey] : "", full);
    callback({ requestHeaders: headers });
  });
  partition.setPermissionCheckHandler(() => true);
  partition.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(true);
  });
  partition.on("will-download", (_event, item) => {
    const name = path.basename(item.getFilename()) || "download";
    item.setSavePath(path.join(app.getPath("downloads"), name));
  });
}

function createWindow() {
  const windowIcon = toNativeImage(nativeImage, withActivity(bases.window, 0, false));
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Microsoft Teams",
    icon: windowIcon,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  mainWindow = window;

  window.webContents.setWindowOpenHandler(() => ({
    action: "allow",
    overrideBrowserWindowOptions: {
      width: 800,
      height: 720,
      autoHideMenuBar: true,
      icon: windowIcon,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    },
  }));

  window.webContents.on("dom-ready", () => installPageHook(window.webContents));
  window.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    window.hide();
  });
  window.loadURL(TEAMS_URL);
  return window;
}

function createTray() {
  const menu = Menu.buildFromTemplate([
    { label: "Открыть", click: showMain },
    {
      label: "Выход",
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);
  const icon = toNativeImage(nativeImage, withActivity(bases.tray, 0, false));
  tray = new Tray(icon);
  tray.setToolTip("Microsoft Teams");
  // Linux StatusNotifier: left click activates, right click opens this menu.
  tray.setContextMenu(menu);
  tray.on("click", showMain);
}

app.setName("teams-client");
app.setDesktopName("com.lics.teams-client");
app.userAgentFallback = chromeUserAgent();
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (process.platform === "linux") {
  app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", showMain);
  app.on("before-quit", () => {
    quitting = true;
  });
  app.on("window-all-closed", () => {});

  ipcMain.on("set-activity", (event, payload) => {
    if (!mainWindow || event.sender.id !== mainWindow.webContents.id) return;
    rememberActivity(Number(payload && payload.messages), payload && payload.incomingCall);
  });

  app.whenReady().then(() => {
    session.defaultSession.setUserAgent(chromeUserAgent());
    allowPermissions();
    bases = loadBases();
    createWindow();
    createTray();
  });
}
