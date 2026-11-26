window.addEventListener("message",async event=>{
  if(event.source!==window||event.data?.source!=="browser-toolkit"||event.data?.type!=="GET_CUSTOM_SCRIPTS")return;
  const nonce=event.data.nonce;
  try{
    const data=await chrome.storage.local.get("customScripts");
    window.postMessage({source:"browser-toolkit-helper",type:"CUSTOM_SCRIPTS",nonce,scripts:Array.isArray(data.customScripts)?data.customScripts:[]},"*");
  }catch(error){
    window.postMessage({source:"browser-toolkit-helper",type:"CUSTOM_SCRIPTS",nonce,scripts:[]},"*");
  }
});