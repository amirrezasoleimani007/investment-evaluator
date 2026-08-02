import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const buildDir = path.resolve("dist-standalone-build");
const outputDir = path.resolve("dist-standalone");
const indexPath = path.join(buildDir, "index.html");

let html = await readFile(indexPath, "utf8");

const stylesheetMatch = html.match(/<link rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
if (!stylesheetMatch) throw new Error("Standalone stylesheet was not found");
const cssPath = path.resolve(buildDir, stylesheetMatch[1]);
const css = (await readFile(cssPath, "utf8")).replaceAll("</style", "<\\/style");
html = html.replace(stylesheetMatch[0], () => `<style>${css}</style>`);

const scriptMatch = html.match(/<script type="module"[^>]+src="([^"]+)"[^>]*><\/script>/);
if (!scriptMatch) throw new Error("Standalone script was not found");
const scriptPath = path.resolve(buildDir, scriptMatch[1]);
const script = (await readFile(scriptPath, "utf8")).replaceAll("</script", "<\\/script");
html = html.replace(scriptMatch[0], () => `<script type="module">${script}</script>`);

html = html.replace(/\s*<link rel="icon"[^>]*>/, "");
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "IPS-Dashboard.html"), html, "utf8");
