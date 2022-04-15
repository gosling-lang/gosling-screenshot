import puppeteer from "puppeteer";

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";

let __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * @param {string} spec
 * @param {{ reactVersion: string, pixijsVersion: string, higlassVersion: string, goslingVersion: string }} pkgOptions
 * @returns {string}
 */
function html(spec, {
	reactVersion = "17",
	pixijsVersion = "6",
	higlassVersion = "1.11",
	goslingVersion = "0.9.17",
} = {}) {
	let baseUrl = "https://unpkg.com";
	return `\
<!DOCTYPE html>
<html>
	<link rel="stylesheet" href="${baseUrl}/higlass@${higlassVersion}/dist/hglib.css">
	<script src="${baseUrl}/react@${reactVersion}/umd/react.production.min.js"></script>
	<script src="${baseUrl}/react-dom@${reactVersion}/umd/react-dom.production.min.js"></script>
	<script src="${baseUrl}/pixi.js@${pixijsVersion}/dist/browser/pixi.min.js"></script>
	<script src="${baseUrl}/higlass@${higlassVersion}/dist/hglib.js"></script>
	<script src="${baseUrl}/gosling.js@${goslingVersion}/dist/gosling.js"></script>
<body>
	<div id="vis"></div>
	<script>
		gosling.embed(document.getElementById("vis"), JSON.parse(\`${spec}\`))
	</script>
</body>
</html>`;
}

// https://www.bannerbear.com/blog/ways-to-speed-up-puppeteer-screenshots/
let minimalArgs = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
];

/**
 * @param {string} spec
 * @param {import("puppeteer").ScreenshotOptions} opts
 * @returns {Promise<Buffer>}
 */
async function screenshot(spec, opts) {
	// TODO: 2022-04-14
	// Should be able to avoid writing to disk all together via:
	//
	// let page = await browser.newPage();
	// await page.setContent(html(spec))
	//
	// but "pubsub-es" dependency of higlass throws an error due to missing origin in this case.
	let tmpfile = path.join(__dirname, "tmp.html");
	await fs.writeFile(tmpfile, html(spec));

	let browser = await puppeteer.launch({
		headless: true,
		args: minimalArgs,
		userDataDir: path.join(__dirname, ".cache"),
	});

	let page = await browser.newPage();
	await page.goto(`file://${tmpfile}`, { waitUntil: "networkidle0" });
	let component = await page.waitForSelector(".gosling-component");
	let buffer = await component.screenshot(opts);

	await Promise.all([
		fs.unlink(tmpfile),
		browser.close(),
	]);

	return buffer;
}

let input = process.argv[2];
let output = process.argv[3];

if (!input || !output) {
	console.error("Usage: node gosling-screenshot.js <input.json> <output.{png,jpeg,webp}>");
	process.exit(1);
}

let spec = await fs.readFile(input, "utf8");
await screenshot(spec, { path: output });
