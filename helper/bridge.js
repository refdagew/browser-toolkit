let menu;
let visible = false;
let scripts = [];

function makeMenu() {
  if (menu) return menu;
  menu = document.createElement("div");
  menu.id = "browser-toolkit-menu";
  menu.style.cssText = "position:fixed;top:20px;right:20px;z-index:2147483647;width:280px;max-height:70vh;overflow:auto;padding:12px;background:#202124;color:#fff;border:1px solid #555;border-radius:10px;box-shadow:0 8px 30px #0008;font:14px Arial,sans-serif";
  const title = document.createElement("div");
  title.textContent = "Browser Toolkit";
  title.style.cssText = "font-weight:bold;font-size:16px;margin:0 0 10px";
  const close = document.createElement("button");
  close.textContent = "×";
  close.title = "Close";
  close.style.cssText = "float:right;border:0;background:transparent;color:white;font-size:20px;cursor:pointer";
  close.addEventListener("click", hideMenu);
  menu.append(close, title);
  (document.documentElement || document.body).append(menu);
  return menu;
}

function hideMenu() {
  visible = false;
  if (menu) menu.remove();
  menu = null;
}

function runCode(code) {
  const script = document.createElement("script");
  const nonceSource = document.querySelector("script[nonce]");
  if (nonceSource) script.nonce = nonceSource.nonce || nonceSource.getAttribute("nonce");
  script.textContent = code;
  (document.head || document.documentElement).append(script);
  script.remove();
}

function renderMenu() {
  const root = makeMenu();
  for (const item of [...root.children].slice(2)) item.remove();
  if (!scripts.length) {
    const empty = document.createElement("p");
    empty.textContent = "No scripts saved. Add some in Browser Toolkit Helper.";
    empty.style.cssText = "color:#ccc;line-height:1.4";
    root.append(empty);
    return;
  }
  for (const script of scripts) {
    const button = document.createElement("button");
    button.textContent = script.button?.label || script.name || script.id;
    button.title = script.description || "";
    button.style.cssText = "display:block;width:100%;margin:6px 0;padding:9px;border:0;border-radius:6px;background:#eee;color:#222;text-align:left;cursor:pointer";
    button.addEventListener("click", () => {
      try {
        runCode(script.code);
        if (script.button?.mode === "toggle") {
          button.textContent = button.textContent === (script.button.activeLabel || "Stop")
            ? (script.button.label || script.name)
            : (script.button.activeLabel || "Stop");
        }
      } catch (error) {
        button.textContent = "Error: " + error.message;
      }
    });
    root.append(button);
  }
}

async function toggleMenu() {
  if (visible) {
    hideMenu();
    return;
  }
  const data = await chrome.storage.local.get("scripts");
  scripts = Array.isArray(data.scripts) ? data.scripts : [];
  visible = true;
  renderMenu();
}

window.addEventListener("browser-toolkit:toggle", toggleMenu);
