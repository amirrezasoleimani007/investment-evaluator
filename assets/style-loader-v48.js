const names = ["ips-v48-css.part-00", "ips-v48-css.part-01", "ips-v48-css.part-02", "ips-v48-css.part-03"];
const base = new URL("./", import.meta.url);
const parts = await Promise.all(names.map(async (name) => {
  const response = await fetch(new URL(name, base));
  if (!response.ok) throw new Error(`Unable to load dashboard style part: ${name}`);
  return response.text();
}));
const style = document.createElement("style");
style.textContent = parts.join("");
document.head.append(style);
