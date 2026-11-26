const list=document.getElementById("scriptList");
const editor=document.getElementById("editor");
const status=document.getElementById("status");
const fileInput=document.getElementById("fileInput");
let scripts=[];
let editingId=null;
const templateCode=`(() => {
  const key = "__myCustomTool";
  if (window[key]) {
    window[key] = false;
    return;
  }
  window[key] = true;
  // Add your code here.
})();`;
function setStatus(message){status.textContent=message}
function safeId(value){return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"")}
function normalize(data){
  if(!data||typeof data!=="object"||typeof data.code!=="string")throw new Error("Invalid bookmarklet JSON.");
  const name=String(data.name||data.id||"Untitled script");
  const id=safeId(String(data.id||name));
  if(!id)throw new Error("A valid script ID is required.");
  const button=data.button||{};
  return {schemaVersion:1,id,name,description:String(data.description||""),button:{label:String(button.label||"Run"),activeLabel:String(button.activeLabel||"Disable"),mode:button.mode==="toggle"?"toggle":"action"},code:data.code};
}
function filename(script){return script.id+".bookmarklet.json"}
function download(script){const blob=new Blob([JSON.stringify(script,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename(script);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function load(){const data=await chrome.storage.local.get("customScripts");scripts=Array.isArray(data.customScripts)?data.customScripts:[];render()}
async function saveAll(){await chrome.storage.local.set({customScripts:scripts});render()}
function render(){
 list.replaceChildren();
 if(!scripts.length){const empty=document.createElement("p");empty.className="hint";empty.textContent="No custom scripts yet. The main bookmarklet works without this extension and syncs the repository scripts automatically.";list.append(empty);return}
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
 const values=script||{name:"New custom script",id:"new-custom-script",description:"A custom Browser Toolkit script.",button:{label:"Run",activeLabel:"Disable",mode:"toggle"},code:templateCode};
 document.getElementById("editorTitle").textContent=script?"Edit custom script":"New custom script";
 document.getElementById("name").value=values.name;
 document.getElementById("scriptId").value=values.id;
 document.getElementById("description").value=values.description;
 document.getElementById("label").value=values.button.label;
 document.getElementById("activeLabel").value=values.button.activeLabel;
 document.getElementById("mode").value=values.button.mode;
 document.getElementById("code").value=values.code;
 editor.hidden=false;
}
function readDraft(){return normalize({id:document.getElementById("scriptId").value,name:document.getElementById("name").value,description:document.getElementById("description").value,button:{label:document.getElementById("label").value,activeLabel:document.getElementById("activeLabel").value,mode:document.getElementById("mode").value},code:document.getElementById("code").value})}
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