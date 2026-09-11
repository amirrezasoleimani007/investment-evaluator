const partNames=["index-v42-2.part-00","index-v42-2.part-01","index-v42-2.part-02","index-v42-2.part-03","index-v42-2.part-04"];
const baseUrl=new URL("./",import.meta.url);
const sourceParts=await Promise.all(partNames.map(async(name)=>{
  const response=await fetch(new URL(name,baseUrl));
  if(!response.ok)throw new Error(`Unable to load dashboard bundle part: ${name}`);
  return response.text();
}));
const moduleUrl=URL.createObjectURL(new Blob([sourceParts.join("")],{type:"text/javascript"}));
try{await import(moduleUrl);}finally{setTimeout(()=>URL.revokeObjectURL(moduleUrl),0);}
