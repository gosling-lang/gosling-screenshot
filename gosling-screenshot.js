import puppeteer from "puppeteer";
import * as fs from "node:fs/promises";

/**
 * @param {string} spec
 * @param {{ reactVersion: string, pixijsVersion: string, higlassVersion: string, goslingVersion: string }} pkgOptions
 * @returns {string}
 */
function html(spec, {
	reactVersion = "18",
	pixijsVersion = "6",
	higlassVersion = "1.13",
	higlassTextVersion = "0.1.6",
	goslingVersion = "1",
} = {}) {
	return `
<head>
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@${reactVersion}",
          "react-dom": "https://esm.sh/react-dom@${reactVersion}",
          "pixi": "https://esm.sh/pixi.js@${pixijsVersion}",
          "higlass": "https://esm.sh/higlass@${higlassVersion}?external=react,react-dom,pixi",
          "higlass-text": "https://esm.sh/higlass-text@${higlassTextVersion}/es/index.js",
          "gosling.js": "https://esm.sh/gosling.js@${goslingVersion}?external=react,react-dom,pixi,higlass,higlass-text"
        }
      }
    </script>
</head>
<div id="vis"></div>
<script type="module">
	import * as gosling from "gosling.js";
	let api = await gosling.embed(document.getElementById("vis"), JSON.parse(\`${spec}\`))
	globalThis.api = api;
</script>
</html>`
}

/**
 * @param {string} spec
 * @param {import("puppeteer").ScreenshotOptions} opts
 * @returns {Promise<Buffer>}
 */
async function screenshot(spec, opts) {
	let browser = await puppeteer.launch({
		headless: true,
		args: ["--use-gl=swiftshader"], // more consistent rendering of transparent elements
	});

	let page = await browser.newPage();
	await page.setContent(html(spec), { waitUntil: "networkidle0" });
	let component = await page.waitForSelector(".gosling-component");
	let buffer = await component.screenshot(opts);
	await browser.close();
	return buffer;
}

let input = process.argv[2];
let output = process.argv[3];

if (!input || !output) {
	console.error(
		"Usage: node gosling-screenshot.js <input.json> <output.{png,jpeg,webp}>",
	);
	process.exit(1);
}

let spec = await fs.readFile(input, "utf8");
// to use escape characters as pure text (e.g., separator: '\t') in `.setContent()`
spec = spec.replaceAll('\\', '\\\\');
await screenshot(spec, { path: output });
