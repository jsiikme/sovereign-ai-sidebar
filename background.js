/* Euria Everywhere — script d'arrière-plan
 * Menus contextuels, raccourci clavier, injection à la demande du script de
 * contenu, et appels streamés (SSE) à l'API AI d'Infomaniak avec retry.
 * defaults.js est chargé avant ce fichier : via le tableau background.scripts
 * sur Firefox, via importScripts dans le service worker Chromium/Brave.
 */

if (typeof importScripts === "function") {
  importScripts("defaults.js");
}

async function getSettings() {
  // Les défauts ne sont pas persistés : ils comblent les clés absentes en lecture.
  return browser.storage.local.get(EURIA_DEFAULTS);
}

/* ---------- Injection à la demande du script de contenu ----------
 * Le script n'est pas déclaré sur <all_urls> : il n'est injecté que lorsque
 * l'utilisateur sollicite l'extension (bouton, menu, raccourci), via activeTab.
 */

async function ensureContentScript(tabId) {
  try {
    await browser.tabs.sendMessage(tabId, { type: "euria-ping" });
  } catch {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["defaults.js", "content.js"]
    });
  }
}

async function sendToTab(tabId, msg) {
  try {
    await ensureContentScript(tabId);
    await browser.tabs.sendMessage(tabId, msg);
  } catch (e) {
    // Page privilégiée (about:, addons.mozilla.org, PDF…) : rien à faire.
    console.warn("Euria : impossible d'ouvrir le panneau sur cet onglet.", e);
  }
}

/* ---------- Menus contextuels ----------
 * Une seule table : définition du menu ET action associée, pour qu'une
 * entrée ne puisse pas exister sans son comportement.
 */

const MENUS = [
  { id: "euria-summarize", titleKey: "menuSummarizePage", contexts: ["page"], action: "summarize", useSelection: false },
  { id: "euria-keypoints", titleKey: "menuKeypoints", contexts: ["page"], action: "keypoints", useSelection: false },
  { id: "euria-translate-page", titleKey: "menuTranslatePage", contexts: ["page"], action: "translate", useSelection: false },
  { id: "euria-summarize-sel", titleKey: "menuSummarizeSel", contexts: ["selection"], action: "summarize", useSelection: true },
  { id: "euria-explain-sel", titleKey: "menuTermSel", contexts: ["selection"], action: "term", useSelection: true },
  { id: "euria-translate-sel", titleKey: "menuTranslateSel", contexts: ["selection"], action: "translate", useSelection: true }
];

async function createMenus() {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({ id: "euria-root", title: EURIA_T("menuRoot"), contexts: ["page", "selection"] });
  for (const { id, titleKey, contexts } of MENUS) {
    browser.contextMenus.create({ id, title: EURIA_T(titleKey), contexts, parentId: "euria-root" });
  }
}

browser.runtime.onInstalled.addListener(async () => {
  createMenus();
  // Premier lancement sans jeton : ouvre directement les préférences.
  const { apiToken } = await browser.storage.local.get({ apiToken: "" });
  if (!apiToken) browser.runtime.openOptionsPage();
});

browser.runtime.onStartup.addListener(createMenus);

browser.contextMenus.onClicked.addListener((info, tab) => {
  const menu = MENUS.find((m) => m.id === info.menuItemId);
  if (!menu || !tab?.id) return;
  sendToTab(tab.id, {
    type: "euria-run",
    action: menu.action,
    selection: menu.useSelection ? (info.selectionText || "") : ""
  });
});

browser.action.onClicked.addListener((tab) => {
  if (tab?.id) sendToTab(tab.id, { type: "euria-toggle" });
});

browser.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-panel") return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) sendToTab(tab.id, { type: "euria-toggle" });
});

/* ---------- Appels API en streaming ---------- */

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const REASONING_FLUSH_MS = 150;

/* L'API Infomaniak n'envoie pas d'en-têtes CORS : le fetch ne fonctionne que
 * si la permission hôte est accordée (facultative pour l'utilisateur en MV3). */
async function checkPrerequisites(settings) {
  if (!settings.apiToken) {
    browser.runtime.openOptionsPage();
    return EURIA_T("errNoToken");
  }
  if (!settings.apiUrl.startsWith(EURIA_API_ORIGIN)) {
    return EURIA_T("errBadUrl").replace("%s", EURIA_API_ORIGIN);
  }
  if (settings.apiUrl.includes(EURIA_URL_PLACEHOLDER)) {
    browser.runtime.openOptionsPage();
    return EURIA_T("errPlaceholder");
  }
  const granted = await browser.permissions.contains({ origins: [EURIA_API_ORIGIN + "*"] });
  if (!granted) {
    return EURIA_T("errNoPermission");
  }
  return null;
}

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== "euria-stream") return;

  let aborter = null;

  port.onMessage.addListener(async (msg) => {
    if (msg.type === "stop") {
      aborter?.abort();
      return;
    }
    if (msg.type !== "chat") return;

    // Protocole : un seul "chat" par port. Si un second arrive malgré tout,
    // on avorte le premier plutôt que d'entrelacer deux flux sur le port.
    aborter?.abort();
    aborter = new AbortController();
    const signal = aborter.signal;

    try {
      const settings = await getSettings();
      const problem = await checkPrerequisites(settings);
      if (problem) {
        port.postMessage({ type: "error", error: problem, retryable: false });
        return;
      }

      const body = {
        model: settings.model,
        messages: msg.messages,
        stream: true
      };
      // Actions simples (résumé, traduction…) : on coupe la phase de
      // « réflexion » de Qwen3.5 — latence et tokens facturés divisés.
      if (msg.thinking === false) {
        body.chat_template_kwargs = { enable_thinking: false };
      }

      let response = null;
      for (let attempt = 0; ; attempt++) {
        response = await fetch(settings.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiToken}`
          },
          body: JSON.stringify(body),
          signal
        });
        if (response.ok || !RETRYABLE_STATUS.has(response.status) || attempt >= MAX_RETRIES) break;
        port.postMessage({ type: "retrying", attempt: attempt + 1, status: response.status });
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1500));
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        port.postMessage({
          type: "error",
          error: `Erreur API (HTTP ${response.status}) : ${text.slice(0, 500)}`,
          retryable: RETRYABLE_STATUS.has(response.status)
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reasoningBuf = "";
      let lastReasoningFlush = 0;

      const flushReasoning = () => {
        if (!reasoningBuf) return;
        port.postMessage({ type: "reasoning", text: reasoningBuf });
        reasoningBuf = "";
      };

      const handleLine = (rawLine) => {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            flushReasoning();
            port.postMessage({ type: "delta", text: delta.content });
          } else if (delta?.reasoning || delta?.reasoning_content) {
            // Relayé par paquets pour ne pas inonder le port.
            reasoningBuf += delta.reasoning || delta.reasoning_content;
            const now = Date.now();
            if (now - lastReasoningFlush > REASONING_FLUSH_MS) {
              lastReasoningFlush = now;
              flushReasoning();
            }
          }
          if (parsed.usage) {
            port.postMessage({ type: "usage", usage: parsed.usage });
          }
        } catch {
          // fragment JSON incomplet, ignoré
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) handleLine(line);
      }
      // Fin de flux : vide le décodeur (caractère multi-octets en attente)
      // et traite une éventuelle dernière ligne sans saut de ligne final.
      buffer += decoder.decode();
      if (buffer) handleLine(buffer);

      port.postMessage({ type: "done" });
    } catch (e) {
      if (e.name === "AbortError") {
        port.postMessage({ type: "done", stopped: true });
      } else {
        port.postMessage({ type: "error", error: String(e), retryable: true });
      }
    } finally {
      if (aborter?.signal === signal) aborter = null;
    }
  });

  port.onDisconnect.addListener(() => aborter?.abort());
});
