const partNames=["index-v48-1.part-00","index-v48-1.part-01","index-v48-1.part-02","index-v48-1.part-03","index-v48-1.part-04","index-v48-1.part-05","index-v48-1.part-06","index-v48-1.part-07","index-v48-1.part-08","index-v48-1.part-09","index-v48-1.part-10","index-v48-1.part-11","index-v48-1.part-12","index-v48-1.part-13"];
const baseUrl=new URL("./",import.meta.url);
const sourceParts=await Promise.all(partNames.map(async(name)=>{
  const response=await fetch(new URL(name,baseUrl));
  if(!response.ok)throw new Error(`Unable to load dashboard bundle part: ${name}`);
  return response.text();
}));
const moduleUrl=URL.createObjectURL(new Blob([sourceParts.join("")],{type:"text/javascript"}));
try{await import(moduleUrl);}finally{setTimeout(()=>URL.revokeObjectURL(moduleUrl),0);}
