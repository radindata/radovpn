(() => {
  "use strict";

  const SOURCES = {
    all: "https://raw.githubusercontent.com/pog7x/vpn-configs/refs/heads/master/githubmirror/1.txt",
    vmess: "https://raw.githubusercontent.com/sakha1370/OpenRay/refs/heads/main/output/kind/vmess.txt",
    vless: "https://raw.githubusercontent.com/sakha1370/OpenRay/refs/heads/main/output/kind/vless.txt",
    trojan: "https://raw.githubusercontent.com/sakha1370/OpenRay/refs/heads/main/output/kind/trojan.txt",
    ss: "https://raw.githubusercontent.com/sakha1370/OpenRay/refs/heads/main/output/kind/ss.txt"
  };

  const PROTOCOLS = {
    vmess: { label: "VMess", prefix: "vmess://" },
    vless: { label: "VLESS", prefix: "vless://" },
    trojan: { label: "Trojan", prefix: "trojan://" },
    ss: { label: "Shadowsocks", prefix: "ss://" }
  };

  let selectedConfig = "";
  let overlay = null;

  function protocolOf(line) {
    const value = String(line || "").trim().toLowerCase();

    for (const protocol of Object.keys(PROTOCOLS)) {
      if (value.startsWith(PROTOCOLS[protocol].prefix)) {
        return protocol;
      }
    }

    return "";
  }

  function cleanLines(text) {
    const seen = new Set();

    return String(text || "")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => {
        if (!line || line.startsWith("#")) return false;

        const protocol = protocolOf(line);

        if (!protocol || seen.has(line)) return false;

        seen.add(line);
        return true;
      });
  }

  function sampleRandom(items, count = 30) {
    const copy = items.slice();

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy.slice(0, Math.min(count, copy.length));
  }

  function ensureStyles() {
    if (document.getElementById("radovpn-config-manager-style")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "radovpn-config-manager-style";

    style.textContent = `
      #radovpn-config-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: calc(18px + env(safe-area-inset-top, 0px)) 14px
                 calc(18px + env(safe-area-inset-bottom, 0px));
        background: rgba(0,0,0,.72);
        direction: rtl;
        font-family: Tahoma, Arial, sans-serif;
        color: #f8fafc;
      }

      #radovpn-config-panel {
        width: min(100%, 520px);
        max-height: 85vh;
        overflow: auto;
        background: #15171d;
        border: 1px solid #30343f;
        border-radius: 18px;
        padding: 18px;
        box-sizing: border-box;
        box-shadow: 0 18px 60px #0008;
      }

      #radovpn-config-panel h2 {
        font-size: 18px;
        margin: 0 0 14px;
      }

      #radovpn-config-panel .radovpn-config-note {
        color: #aab2c0;
        font-size: 13px;
        margin: 0 0 12px;
      }

      #radovpn-config-panel button {
        font: inherit;
        cursor: pointer;
        border: 0;
        border-radius: 10px;
        padding: 11px 13px;
        color: #fff;
        background: #343946;
      }

      #radovpn-config-panel button:disabled {
        opacity: .55;
        cursor: wait;
      }

      #radovpn-config-close {
        float: left;
        padding: 6px 10px !important;
      }

      #radovpn-config-status {
        margin: 12px 0;
        font-size: 13px;
        color: #cbd5e1;
        white-space: pre-wrap;
      }

      #radovpn-config-list {
        display: grid;
        gap: 8px;
      }

      .radovpn-config-item {
        text-align: right;
        width: 100%;
        overflow-wrap: anywhere;
        background: #20242d !important;
        border: 1px solid #343a46 !important;
      }

      .radovpn-config-item small {
        display: block;
        color: #aab2c0;
        margin-top: 5px;
      }

      #radovpn-protocol-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }

      #radovpn-protocol-options button {
        background: #252a35;
        border: 1px solid #3b4351;
      }
    `;

    document.head.appendChild(style);
  }

  function closeOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  function showOverlay(title, note = "") {
    ensureStyles();
    closeOverlay();

    overlay = document.createElement("div");
    overlay.id = "radovpn-config-overlay";

    overlay.innerHTML = `
      <section id="radovpn-config-panel" role="dialog" aria-modal="true">
        <button id="radovpn-config-close" type="button" aria-label="بستن">✕</button>
        <h2>${escapeHtml(title)}</h2>
        <p class="radovpn-config-note">${escapeHtml(note)}</p>
        <div id="radovpn-config-status"></div>
        <div id="radovpn-config-list"></div>
      </section>
    `;

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeOverlay();
    });

    overlay
      .querySelector("#radovpn-config-close")
      .addEventListener("click", closeOverlay);

    document.body.appendChild(overlay);

    return overlay;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function shortLabel(config) {
    const protocol = protocolOf(config);
    const fragment = config.split("#")[1];

    let label = fragment ? decodeURIComponentSafe(fragment) : "";

    if (!label) {
      try {
        const afterScheme = config.substring(config.indexOf("://") + 3);
        label = afterScheme.split("@").pop().split(/[?:/]/)[0];
      } catch (_) {}
    }

    return `${PROTOCOLS[protocol]?.label || "Config"}${label ? " — " + label : ""}`;
  }

  function decodeURIComponentSafe(value) {
    try {
      return decodeURIComponent(value);
    } catch (_) {
      return value;
    }
  }

  function renderList(configs) {
    const list = overlay?.querySelector("#radovpn-config-list");

    if (!list) return;

    list.replaceChildren();

    if (!configs.length) {
      const status = overlay.querySelector("#radovpn-config-status");

      if (status) {
        status.textContent = "کانفیگ معتبری برای نمایش پیدا نشد.";
      }

      return;
    }

    configs.forEach((config, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "radovpn-config-item";

      button.innerHTML = `
        <strong>${index + 1}. ${escapeHtml(shortLabel(config))}</strong>
        <small>${escapeHtml(config.slice(0, 125))}${config.length > 125 ? "…" : ""}</small>
      `;

      button.addEventListener("click", () => {
        selectedConfig = config;
        window.RadoVPNSelectedConfig = config;

        window.dispatchEvent(new CustomEvent("radovpn:config-selected", {
          detail: {
            config,
            protocol: protocolOf(config)
          }
        }));

        const status = overlay?.querySelector("#radovpn-config-status");

        if (status) {
          status.textContent =
            "کانفیگ انتخاب شد. برای استفاده در اتصال، هنوز باید به بخش اتصال برنامه متصل شود.";
        }

        button.style.borderColor = "#22c55e";
        button.style.background = "#183328";
      });

      list.appendChild(button);
    });
  }

  async function loadList(protocol = "") {
    const key = protocol || "all";

    const title = protocol
      ? `کانفیگ‌های ${PROTOCOLS[protocol].label}`
      : "کانفیگ‌های تصادفی";

    showOverlay(
      title,
      protocol
        ? "۳۰ کانفیگ تصادفی از منبع اختصاصی این پروتکل"
        : "تا ۳۰ کانفیگ تصادفی از منبع عمومی؛ فقط VMess، VLESS، Trojan و Shadowsocks"
    );

    const status = overlay.querySelector("#radovpn-config-status");
    status.textContent = "در حال دریافت کانفیگ‌ها…";

    const list = overlay.querySelector("#radovpn-config-list");
    const close = overlay.querySelector("#radovpn-config-close");

    close.disabled = false;

    try {
      const response = await fetch(SOURCES[key], {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.text();

      let configs = cleanLines(raw);

      if (protocol) {
        configs = configs.filter(item => protocolOf(item) === protocol);
      }

      configs = sampleRandom(configs, 30);

      status.textContent = configs.length
        ? `${configs.length} کانفیگ دریافت شد. یکی را برای انتخاب لمس کنید.`
        : "منبع پاسخ داد اما کانفیگ پشتیبانی‌شده‌ای پیدا نشد.";

      renderList(configs);

    } catch (error) {
      status.textContent =
        `دریافت کانفیگ ناموفق بود.\n` +
        `لطفاً اینترنت یا دسترسی به منبع را بررسی کنید.\n` +
        `جزئیات: ${error?.message || "خطای ناشناخته"}`;

      list.replaceChildren();
    }
  }

  function showProtocolPicker() {
    const root = showOverlay(
      "انتخاب پروتکل",
      "برای دریافت ۳۰ کانفیگ تصادفی، یک پروتکل را انتخاب کنید."
    );

    const list = root.querySelector("#radovpn-config-list");
    const options = document.createElement("div");

    options.id = "radovpn-protocol-options";

    Object.entries(PROTOCOLS).forEach(([key, item]) => {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = item.label;

      button.addEventListener("click", () => loadList(key));

      options.appendChild(button);
    });

    list.appendChild(options);

    root.querySelector("#radovpn-config-status").textContent = "";
  }

  function buttonText(element) {
    return (element?.innerText || element?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element
      ? event.target.closest("button")
      : null;

    if (!target) return;

    const label = buttonText(target);

    if (label === "پیدا کن") {
      event.preventDefault();
      event.stopImmediatePropagation();
      loadList("");

    } else if (label.includes("پیکربندی پروتکل")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showProtocolPicker();
    }
  }, true);

  window.RadoVPNConfigManager = {
    loadList,
    showProtocolPicker,
    getSelectedConfig: () => selectedConfig,
    getProtocol: protocolOf
  };
})();
