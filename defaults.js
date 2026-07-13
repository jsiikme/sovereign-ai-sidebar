/* Euria Everywhere — valeurs par défaut partagées.
 * Chargé avant background.js (manifest), content.js (executeScript) et
 * options.js (options.html) : une seule source de vérité pour les défauts.
 * Les défauts ne sont JAMAIS écrits dans storage.local : ils ne s'appliquent
 * qu'en lecture (storage.local.get(defaults)), pour que les mises à jour de
 * l'extension puissent les faire évoluer.
 */

/* Chromium (Brave, Chrome…) expose chrome.* ; on aligne sur l'API promise
 * browser.* utilisée partout (chrome.* renvoie des promesses en MV3). */
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

/* YOUR_PRODUCT_ID est un placeholder : chaque utilisateur remplace ce segment
 * par l'identifiant de SON produit AI Services (Manager Infomaniak), dans les
 * préférences. Aucune ID de compte réelle n'est embarquée dans le code. */
var EURIA_DEFAULTS = {
  apiUrl: "https://api.infomaniak.com/2/ai/YOUR_PRODUCT_ID/openai/v1/chat/completions",
  apiToken: "",
  model: "Qwen/Qwen3.5-122B-A10B-FP8",
  maxPageChars: 24000,
  lastLang: "fr"
};

var EURIA_URL_PLACEHOLDER = "YOUR_PRODUCT_ID";

/* Seul domaine autorisé pour l'API : le jeton ne doit jamais partir ailleurs. */
var EURIA_API_ORIGIN = "https://api.infomaniak.com/";

/* ---------- i18n : bascule automatique sur la langue du navigateur ----------
 * Français si la locale de l'interface commence par « fr », anglais sinon.
 * Partagé par background.js, content.js et options.js. */
function EURIA_LANG() {
  var l = "en";
  try {
    l = (browser.i18n && browser.i18n.getUILanguage && browser.i18n.getUILanguage())
      || (typeof navigator !== "undefined" && navigator.language) || "en";
  } catch (e) { /* contexte sans i18n */ }
  return String(l).toLowerCase().indexOf("fr") === 0 ? "fr" : "en";
}

var EURIA_STRINGS = {
  fr: {
    // Menus contextuels + bouton barre d'outils
    menuRoot: "Euria",
    menuSummarizePage: "Résumer la page",
    menuKeypoints: "Extraire les points clés",
    menuTranslatePage: "Traduire la page",
    menuSummarizeSel: "Résumer la sélection",
    menuTermSel: "Rechercher « %s »",
    menuTranslateSel: "Traduire la sélection",
    actionTitle: "Euria — assistant IA",
    // Erreurs (arrière-plan)
    errNoToken: "Aucun jeton API configuré. La page de préférences vient de s'ouvrir : collez-y votre jeton Infomaniak AI Tools.",
    errBadUrl: "URL d'API refusée : le jeton n'est envoyé qu'à %s. Corrigez l'URL dans les préférences.",
    errNoPermission: "Permission manquante pour api.infomaniak.com. Ouvrez about:addons → Euria Everywhere → Permissions et autorisez l'accès à api.infomaniak.com.",
    // Panneau
    hello: "Bonjour,",
    help: "Comment puis-je vous aider ?",
    suggSummarize: "Résumer",
    suggKeypoints: "Extraire les points clés",
    suggTerm: "Rechercher un terme",
    suggTranslate: "Traduire",
    placeholder: "Posez votre question ici",
    placeholderTerm: "Entrez le terme à rechercher…",
    disclaimer: "Euria peut se tromper. Vérifiez en cas de doute.",
    thinking: "Euria réfléchit",
    reasoning: "Raisonnement",
    copy: "Copier",
    copied: "Copié ✓",
    retry: "Réessayer",
    emptyResp: "(réponse vide)",
    stoppedResp: "(interrompu)",
    interrupted: "interrompu",
    busy: "Une réponse est déjà en cours…",
    aExpand: "Agrandir",
    aReset: "Nouvelle conversation",
    aClose: "Fermer",
    aInput: "Votre question",
    aSend: "Envoyer",
    aStop: "Arrêter",
    dialogLabel: "Euria — assistant IA",
    tokens: "tokens",
    selectionSuffix: " (sélection)",
    translateIn: " en %s",
    labelSep: " : ",
    // Étiquettes d'action (bulle utilisateur)
    actSummarize: "Résumer",
    actKeypoints: "Extraire les points clés",
    actTranslate: "Traduire",
    actTerm: "Rechercher un terme",
    // Messages transitoires
    retrying: "Serveur occupé (HTTP %s), nouvelle tentative %a/2…",
    errDisconnect: "Connexion au processus d'arrière-plan perdue (extension rechargée ?). Réessayez.",
    // Préférences
    optTitle: "Euria Everywhere (Unofficial) — Préférences",
    optApiUrl: "URL de l'API",
    optApiToken: "Jeton API (Bearer)",
    optHint: "Jeton Infomaniak AI Tools. Ne partagez jamais ce jeton.",
    optModel: "Modèle",
    optMaxChars: "Taille max. du contenu de page envoyé (caractères)",
    optSave: "Enregistrer",
    optSaved: "Enregistré ✓",
    optUrlRejected: "URL refusée : elle doit commencer par %s",
    optUrlHint: "Remplacez YOUR_PRODUCT_ID par l'identifiant de votre produit AI Services (Manager Infomaniak).",
    errPlaceholder: "Configurez votre URL d'API : remplacez YOUR_PRODUCT_ID par l'ID de votre produit AI Services dans les préférences."
  },
  en: {
    menuRoot: "Euria",
    menuSummarizePage: "Summarize page",
    menuKeypoints: "Extract key points",
    menuTranslatePage: "Translate page",
    menuSummarizeSel: "Summarize selection",
    menuTermSel: "Look up “%s”",
    menuTranslateSel: "Translate selection",
    actionTitle: "Euria — AI assistant",
    errNoToken: "No API token configured. The preferences page just opened: paste your Infomaniak AI Tools token there.",
    errBadUrl: "API URL rejected: the token is only ever sent to %s. Fix the URL in the preferences.",
    errNoPermission: "Missing permission for api.infomaniak.com. Open about:addons → Euria Everywhere → Permissions and allow access to api.infomaniak.com.",
    hello: "Hello,",
    help: "How can I help you?",
    suggSummarize: "Summarize",
    suggKeypoints: "Extract key points",
    suggTerm: "Look up a term",
    suggTranslate: "Translate",
    placeholder: "Ask your question here",
    placeholderTerm: "Enter the term to look up…",
    disclaimer: "Euria can make mistakes. Double-check when in doubt.",
    thinking: "Euria is thinking",
    reasoning: "Reasoning",
    copy: "Copy",
    copied: "Copied ✓",
    retry: "Retry",
    emptyResp: "(empty response)",
    stoppedResp: "(stopped)",
    interrupted: "stopped",
    busy: "A response is already in progress…",
    aExpand: "Expand",
    aReset: "New conversation",
    aClose: "Close",
    aInput: "Your question",
    aSend: "Send",
    aStop: "Stop",
    dialogLabel: "Euria — AI assistant",
    tokens: "tokens",
    selectionSuffix: " (selection)",
    translateIn: " to %s",
    labelSep: ": ",
    actSummarize: "Summarize",
    actKeypoints: "Extract key points",
    actTranslate: "Translate",
    actTerm: "Look up a term",
    retrying: "Server busy (HTTP %s), retrying %a/2…",
    errDisconnect: "Lost connection to the background process (extension reloaded?). Please retry.",
    optTitle: "Euria Everywhere (Unofficial) — Preferences",
    optApiUrl: "API URL",
    optApiToken: "API token (Bearer)",
    optHint: "Infomaniak AI Tools token. Never share this token.",
    optModel: "Model",
    optMaxChars: "Max size of page content sent (characters)",
    optSave: "Save",
    optSaved: "Saved ✓",
    optUrlRejected: "URL rejected: it must start with %s",
    optUrlHint: "Replace YOUR_PRODUCT_ID with your AI Services product ID (Infomaniak Manager).",
    errPlaceholder: "Configure your API URL: replace YOUR_PRODUCT_ID with your AI Services product ID in the preferences."
  }
};

function EURIA_T(key) {
  var lang = EURIA_LANG();
  return (EURIA_STRINGS[lang] && EURIA_STRINGS[lang][key]) || EURIA_STRINGS.en[key] || key;
}
