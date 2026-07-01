// ContextChat loader — drop-in embed snippet.
//
// Two ways to configure:
//   A) Set window.ContextChat = { chatEndpoint, ... } BEFORE this script loads, or
//   B) Put config as data-* attributes on this <script> tag, e.g.
//        <script src=".../loader.js"
//                data-chat-endpoint="https://your-worker.workers.dev/chat"
//                data-turnstile-sitekey="0x..."
//                data-assistant-name="Acme Assistant"
//                data-starter-questions='["How do I authenticate?"]'
//                data-theme='{"--primary":"#4f46e5"}'
//                defer></script>
//
// The loader injects widget.js from the chatEndpoint's origin and is idempotent
// (safe to run twice, e.g. on SPA navigation).
(function () {
  if (window.__contextChatLoaded) return;

  var current = document.currentScript;

  function parseJson(value) {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  }

  function fromDataset() {
    if (!current || !current.dataset || !current.dataset.chatEndpoint) return null;
    var d = current.dataset;
    return {
      chatEndpoint: d.chatEndpoint,
      turnstileSitekey: d.turnstileSitekey,
      assistantName: d.assistantName,
      tagline: d.tagline,
      welcomeHeading: d.welcomeHeading,
      welcomeSubtext: d.welcomeSubtext,
      launcherLabel: d.launcherLabel,
      disclaimer: d.disclaimer,
      hotkey: d.hotkey,
      fontFamily: d.fontFamily,
      fontUrl: d.fontUrl,
      starterQuestions: parseJson(d.starterQuestions),
      theme: parseJson(d.theme),
      widgetSrc: d.widgetSrc,
    };
  }

  var config = window.ContextChat || fromDataset();
  if (!config || !config.chatEndpoint) {
    console.warn(
      "[ContextChat] no config found (set window.ContextChat or data-chat-endpoint); widget not loaded.",
    );
    return;
  }

  window.ContextChat = config;
  window.__contextChatLoaded = true;

  // widget.js is served by the same Worker that hosts chatEndpoint.
  var widgetSrc = config.widgetSrc;
  if (!widgetSrc) {
    try {
      widgetSrc = new URL("/widget.js", config.chatEndpoint).href;
    } catch (e) {
      console.warn("[ContextChat] invalid chatEndpoint:", config.chatEndpoint);
      return;
    }
  }

  var script = document.createElement("script");
  script.src = widgetSrc;
  script.defer = true;
  document.head.appendChild(script);
})();
