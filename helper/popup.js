const list = document.getElementById("scriptList");
const editor = document.getElementById("editor");
const status = document.getElementById("status");
const fileInput = document.getElementById("fileInput");
const fields = ["name", "scriptId", "description", "label", "activeLabel", "mode", "code"];
let scripts = [];
let editingId = null;

function setStatus(message) {
  status.textContent = message;
}

function safeId(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalize(data) {
  if (!data || typeof data !== "object" || typeof data.code !== "string") throw new Error("Invalid bookmarklet JSON.");
  const name = String(data.name || data.id || "Untitled script");
  const id = safeId(String(data.id || name));
  if (!id) throw new Error("A valid script ID is required.");
  const button = data.button || {};
  const mode = button.mode === "toggle" ? "toggle" : "action";
  return {
    schemaVersion: 1,
    id,
    name,
    description: String(data.description || ""),
    button: {
      label: String(button.label || "Run"),
      activeLabel: String(button.activeLabel || "Stop"),
      mode
    },
    code: data.code
  };
}

function fileName(script) {
  return script.id + ".bookmarklet.json";
}

function download(script) {
  const blob = new Blob([JSON.stringify(script, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(script);
  a.click();
  URL.revokeObjectURL(url);
}

async function load() {
  const data = await chrome.storage.local.get("scripts");
  scripts = Array.isArray(data.scripts) ? data.scripts : [];
  render();
}

async function saveAll() {
  await chrome.storage.local.set({ scripts });
  render();
}

function render() {
  list.replaceChildren();
  if (!scripts.length) {
    const empty = document.createElement("p");
    empty.textContent = "No scripts saved yet.";
    list.append(empty);
    return;
  }
  for (const script of scripts) {
    const row = document.createElement("div");
    row.className = "script";
    const info = document.createElement("div");
    info.className = "script-info";
    const name = document.createElement("strong");
    name.textContent = script.name;
    const detail = document.createElement("small");
    detail.textContent = script.id + " · " + script.button.mode;
    info.append(name, detail);
    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openEditor(script));
    const exportButton = document.createElement("button");
    exportButton.textContent = "Export";
    exportButton.className = "secondary";
    exportButton.addEventListener("click", () => download(script));
    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.className = "danger";
    remove.addEventListener("click", async () => {
      if (!confirm("Delete " + script.name + "?")) return;
      scripts = scripts.filter(item => item.id !== script.id);
      await saveAll();
      setStatus("Script deleted.");
    });
    row.append(info, edit, exportButton, remove);
    list.append(row);
  }
}

function openEditor(script = null) {
  editingId = script ? script.id : null;
  document.getElementById("editorTitle").textContent = script ? "Edit script" : "New script";
  const values = script || {
    name: "",
    id: "",
    description: "",
    button: { label: "Run", activeLabel: "Stop", mode: "action" },
    code: ""
  };
  document.getElementById("name").value = values.name;
  document.getElementById("scriptId").value = values.id;
  document.getElementById("description").value = values.description;
  document.getElementById("label").value = values.button.label;
  document.getElementById("activeLabel").value = values.button.activeLabel;
  document.getElementById("mode").value = values.button.mode;
  document.getElementById("code").value = values.code;
  editor.hidden = false;
  editor.scrollIntoView({ block: "nearest" });
}

document.getElementById("newScript").addEventListener("click", () => openEditor());
document.getElementById("cancelEdit").addEventListener("click", () => { editor.hidden = true; });
document.getElementById("importScripts").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  for (const file of fileInput.files) {
    try {
      const parsed = normalize(JSON.parse(await file.text()));
      const index = scripts.findIndex(item => item.id === parsed.id);
      if (index >= 0) scripts[index] = parsed;
      else scripts.push(parsed);
    } catch (error) {
      setStatus(file.name + ": " + error.message);
    }
  }
  await saveAll();
  fileInput.value = "";
  setStatus("Import complete.");
});

editor.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const script = normalize({
      schemaVersion: 1,
      id: document.getElementById("scriptId").value,
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      button: {
        label: document.getElementById("label").value,
        activeLabel: document.getElementById("activeLabel").value,
        mode: document.getElementById("mode").value
      },
      code: document.getElementById("code").value
    });
    const duplicate = scripts.some(item => item.id === script.id && item.id !== editingId);
    if (duplicate) throw new Error("That script ID is already in use.");
    scripts = scripts.filter(item => item.id !== editingId);
    scripts.push(script);
    await saveAll();
    editor.hidden = true;
    setStatus("Script saved.");
  } catch (error) {
    setStatus(error.message);
  }
});

load().catch(error => setStatus(error.message));