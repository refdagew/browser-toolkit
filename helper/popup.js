const list=document.getElementById("scriptList");
const editor=document.getElementById("editor");
const status=document.getElementById("status");
const fileInput=document.getElementById("fileInput");
const jsonEditor=document.getElementById("jsonEditor");
let scripts=[];
let editingId=null;
const template={schemaVersion:1,id:"my-custom-script",name:"My custom script",description:"Describe what this script does.",button:{label:"Run",activeLabel:"Stop",mode:"run"},code:`(() => {\n  const key = "__myCustomScript";\n  if (window[key]) {\n    window[key] = false;\n    return;\n  }\n  window[key] = true;\n})();`};
function setStatus(message){status.textContent=message}
function safeId(value){return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"")}
function normalize(data){
 if(!data||typeof data!=="object"||typeof data.code!=="string")throw new Error("Invalid bookmarklet JSON: code must be a string.");
 const name=String(data.name||data.id||"Untitled script");
 const id=safeId(String(data.id||name));
 if(!id)throw new Error("A valid script ID is required.");
 const button=data.button||{};
 return {schemaVersion:1,id,name,description:String(data.description||""),button:{label:String(button.label||"Run"),activeLabel:String(button.activeLabel||"Disable"),mode:button.mode==="toggle"?"toggle":"run"},code:data.code};
}
function download(script){const blob=new Blob([JSON.stringify(script,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=script.id+".bookmarklet.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function load(){const data=await chrome.storage.local.get("customScripts");scripts=Array.isArray(data.customScripts)?data.customScripts:[];render()}
async function saveAll(){await chrome.storage.local.set({customScripts:scripts});render()}
function render(){
 list.replaceChildren();
 if(!scripts.length){const empty=document.createElement("p");empty.className="hint";empty.textContent="No custom scripts saved. The bookmarklet works without this extension and syncs the repository scripts on its own.";list.append(empty);return}
 for(const script of scripts){
  const row=document.createElement("div");row.className="script";
  const info=document.createElement("div");info.className="script-info";
  const name=document.createElement("strong");name.textContent=script.name;
  const detail=document.createElement("small");detail.textContent=script.id+" · "+script.button.mode;
  info.append(name,detail);
  const edit=document.createElement("button");edit.textContent="Edit";edit.className="quiet";edit.addEventListener("click",()=>openEditor(script));
  const exp=document.createElement("button");exp.textContent="Export";exp.className="quiet";exp.addEventListener("click",()=>download(script));
  const del=document.createElement("button");del.textContent="×";del.className="danger";del.title="Delete";del.addEventListener("click",async()=>{if(!confirm("Delete "+script.name+"?"))return;scripts=scripts.filter(x=>x.id!==script.id);await saveAll();setStatus("Script deleted.")});
  row.append(info,edit,exp,del);list.append(row);
 }
}
function openEditor(script=null){
 editingId=script?script.id:null;
 document.getElementById("editorTitle").textContent=script?"Edit custom script":"New custom script";
 jsonEditor.value=JSON.stringify(script||template,null,2);
 editor.hidden=false;
}
function readDraft(){const data=JSON.parse(jsonEditor.value);data.button=data.button||{};data.button.mode=document.getElementById("mode").value;return normalize(data)}
document.getElementById("newScript").addEventListener("click",()=>openEditor());
document.getElementById("cancelEdit").addEventListener("click",()=>{editor.hidden=true});
document.getElementById("exportDraft").addEventListener("click",()=>{try{download(readDraft())}catch(e){setStatus(e.message)}});
document.getElementById("importScripts").addEventListener("click",()=>fileInput.click());
fileInput.addEventListener("change",async()=>{
 let imported=0;
 for(const file of fileInput.files){try{const script=normalize(JSON.parse(await file.text()));const i=scripts.findIndex(x=>x.id===script.id);if(i>=0)scripts[i]=script;else scripts.push(script);imported++}catch(e){setStatus(file.name+": "+e.message)}}
 await saveAll();fileInput.value="";setStatus("Imported "+imported+" script(s).");
});
editor.addEventListener("submit",async event=>{
 event.preventDefault();
 try{const script=readDraft();if(scripts.some(x=>x.id===script.id&&x.id!==editingId))throw new Error("That script ID is already in use.");scripts=scripts.filter(x=>x.id!==editingId);scripts.push(script);await saveAll();editor.hidden=true;setStatus("Custom script saved.");}
 catch(e){setStatus(e.message)}
});
load().catch(e=>setStatus(e.message));