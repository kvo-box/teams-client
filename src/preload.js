const { ipcRenderer, webFrame } = require("electron");
const { pageHook } = require("./page-hook");

const CALL_SELECTORS = [
  "[data-tid='incoming-call-toast']",
  "[data-tid='incoming-call']",
  "[data-tid='calling-toast']",
  "[data-tid='ufd-incoming-call']",
  "[data-tid='call-toast']",
  "[aria-label*='Incoming call' i]",
  "[aria-label*='Входящий звонок' i]",
  "[aria-label*='Входящий вызов' i]",
];

function isTopFrame() {
  try {
    return window.top === window;
  } catch (_) {
    return false;
  }
}

if (isTopFrame()) {
  let callUntil = 0;
  let lastKey = "";

  function messageCount() {
    const titleCount = /^\((\d+)\)/.exec(document.title || "");
    let domCount = 0;
    document
      .querySelectorAll(
        "[data-tid='app-bar'] .fui-CounterBadge, [role='navigation'] .fui-CounterBadge, #chat-button .fui-CounterBadge, #activity-button .fui-CounterBadge, [data-tid='chat-tab'] .fui-CounterBadge, [data-tid='activity-feed-tab'] .fui-CounterBadge",
      )
      .forEach((node) => {
        const value = parseInt((node.textContent || "").trim(), 10);
        if (!Number.isNaN(value)) domCount += value;
      });
    return Math.max(titleCount ? Number(titleCount[1]) : 0, domCount);
  }

  function incomingCall() {
    if (Date.now() < callUntil) return true;
    return CALL_SELECTORS.some((selector) => {
      try {
        return Boolean(document.querySelector(selector));
      } catch (_) {
        return false;
      }
    });
  }

  function publish() {
    const messages = messageCount();
    const call = incomingCall();
    const key = messages + ":" + (call ? 1 : 0);
    if (key === lastKey) return;
    lastKey = key;
    ipcRenderer.send("set-activity", { messages, incomingCall: call });
  }

  document.addEventListener("teams-incoming-call", () => {
    callUntil = Date.now() + 20000;
    publish();
  });

  const chromeVersion = (process.versions && process.versions.chrome) || "0";
  try {
    webFrame.executeJavaScriptInIsolatedWorld(0, [{ code: pageHook(chromeVersion) }]);
  } catch (error) {
    console.error("teams page hook failed", error);
  }

  setInterval(publish, 1000);
  publish();
}
