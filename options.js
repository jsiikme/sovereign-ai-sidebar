/* Préférences — defaults.js est chargé avant ce fichier (options.html).
 * Un champ vidé revient à sa valeur par défaut (rien n'est stocké en vide,
 * pour ne pas masquer les défauts) et l'URL d'API est verrouillée sur le
 * domaine Infomaniak : le jeton ne doit jamais partir ailleurs.
 */

const FIELDS = ["apiUrl", "apiToken", "model", "maxPageChars"];

// Localise l'interface selon la langue du navigateur (voir defaults.js).
function localize() {
  document.documentElement.lang = EURIA_LANG();
  document.title = EURIA_T("optTitle");
  const map = {
    "t-title": "optTitle", "t-apiUrl": "optApiUrl", "t-apiToken": "optApiToken",
    "t-hint": "optHint", "t-urlHint": "optUrlHint", "t-model": "optModel", "t-maxPageChars": "optMaxChars", "save": "optSave"
  };
  for (const [id, key] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = EURIA_T(key);
  }
}

function setStatus(text, isError) {
  const status = document.getElementById("status");
  status.textContent = text;
  status.className = isError ? "error" : "";
  if (!isError) setTimeout(() => (status.textContent = ""), 2000);
}

async function load() {
  const values = await browser.storage.local.get(EURIA_DEFAULTS);
  for (const key of FIELDS) {
    document.getElementById(key).value = values[key];
  }
}

async function save() {
  const values = {};
  for (const key of FIELDS) {
    const el = document.getElementById(key);
    values[key] = el.type === "number" ? Number(el.value) : el.value.trim();
  }

  // Champ vide ou invalide → retour au défaut (sauf le jeton, qui peut être vide).
  if (!values.apiUrl) values.apiUrl = EURIA_DEFAULTS.apiUrl;
  if (!values.model) values.model = EURIA_DEFAULTS.model;
  if (!(values.maxPageChars > 0)) values.maxPageChars = EURIA_DEFAULTS.maxPageChars;

  if (!values.apiUrl.startsWith(EURIA_API_ORIGIN)) {
    setStatus(EURIA_T("optUrlRejected").replace("%s", EURIA_API_ORIGIN), true);
    return;
  }
  if (values.apiUrl.includes(EURIA_URL_PLACEHOLDER)) {
    setStatus(EURIA_T("errPlaceholder"), true);
    return;
  }

  await browser.storage.local.set(values);
  await load(); // réaffiche les valeurs normalisées
  setStatus(EURIA_T("optSaved"), false);
}

document.getElementById("save").addEventListener("click", save);
localize();
load();
