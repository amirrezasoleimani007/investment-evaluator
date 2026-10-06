const partNames=["style-v48-1.part-00","style-v48-1.part-01","style-v48-1.part-02","style-v48-1.part-03","style-v48-1.part-04","style-v48-1.part-05"];
const baseUrl=new URL("./",import.meta.url);
const styleParts=await Promise.all(partNames.map(async(name)=>{
  const response=await fetch(new URL(name,baseUrl));
  if(!response.ok)throw new Error(`Unable to load dashboard style part: ${name}`);
  return response.text();
}));
const style=document.createElement("style");
style.dataset.release="financial-watch-v48.1";
style.textContent=styleParts.join("");
document.head.appendChild(style);
