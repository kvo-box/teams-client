// Runs in the page before Teams reads the browser identity. Electron's brand list
// is only "Chromium", and Teams treats the window as Chrome solely when the brand
// "Google Chrome" is present. Call notifications are reported to the preload.
function pageHook(chromeVersion) {
  const major = String(chromeVersion).split(".")[0] || "0";
  return `(() => {
  if (window.__teamsPageHook) return;
  window.__teamsPageHook = true;

  const major = ${JSON.stringify(major)};
  const native = navigator.userAgentData;
  const keepBrand = (item) => item && item.brand !== "Google Chrome" && !/electron/i.test(item.brand || "");
  const lowEntropy = (native && native.brands ? native.brands.filter(keepBrand) : [
    { brand: "Chromium", version: major },
    { brand: "Not.A/Brand", version: "24" },
  ]).concat([{ brand: "Google Chrome", version: major }]);
  const uaData = {
    brands: lowEntropy,
    mobile: native ? Boolean(native.mobile) : false,
    platform: native && native.platform ? native.platform : "Linux",
    getHighEntropyValues: (hints) => {
      const fallback = Promise.resolve({
        brands: lowEntropy,
        mobile: false,
        platform: "Linux",
        architecture: "x86",
        bitness: "64",
        uaFullVersion: major + ".0.0.0",
        fullVersionList: lowEntropy.map((item) => ({ brand: item.brand, version: major + ".0.0.0" })),
      });
      const pending = native && native.getHighEntropyValues ? native.getHighEntropyValues(hints) : fallback;
      return Promise.resolve(pending).then((values) => {
        const full = values.uaFullVersion || major + ".0.0.0";
        values.brands = (values.brands || lowEntropy).filter(keepBrand).concat([{ brand: "Google Chrome", version: major }]);
        if (Array.isArray(values.fullVersionList)) {
          values.fullVersionList = values.fullVersionList.filter(keepBrand).concat([{ brand: "Google Chrome", version: full }]);
        }
        return values;
      });
    },
    toJSON() {
      return { brands: this.brands, mobile: this.mobile, platform: this.platform };
    },
  };
  Object.defineProperty(navigator, "userAgentData", { configurable: true, get: () => uaData });
  if (!window.chrome) window.chrome = { runtime: {} };

  try {
    const NativeNotification = window.Notification;
    if (typeof NativeNotification === "function" && NativeNotification.name !== "TeamsCallNotification") {
      const Wrapped = function TeamsCallNotification(title, options) {
        const text = String(title || "") + " " + String((options && options.body) || "");
        if (/call|calling|звон|вызов/i.test(text)) {
          document.dispatchEvent(new CustomEvent("teams-incoming-call"));
        }
        return new NativeNotification(title, options);
      };
      Wrapped.prototype = NativeNotification.prototype;
      Object.setPrototypeOf(Wrapped, NativeNotification);
      Wrapped.permission = NativeNotification.permission;
      Wrapped.requestPermission = NativeNotification.requestPermission.bind(NativeNotification);
      window.Notification = Wrapped;
    }
  } catch (_) {}
})();`;
}

module.exports = { pageHook };
