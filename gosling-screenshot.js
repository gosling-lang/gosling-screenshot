import puppeteer from "puppeteer";
import * as fs from "node:fs";
import * as path from "node:path";
import * as util from "node:util";

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
</html>`;
}

/**
 * @param {string} spec
 * @param {import("puppeteer").ScreenshotOptions} opts
 * @returns {Promise<Buffer>}
 */
async function screenshot(spec, opts) {
	let browser = await puppeteer.launch({
		headless: true,
		args: [
			"--use-gl=swiftshader",  // more consistent rendering of transparent elements
			"--disable-web-security",  // disable CORS
			"--allow-file-access-from-files",  // allow access to local files
			"--disable-features=IsolateOrigins,site-per-process"  // improve worker communication
		],
	});

	let page = await browser.newPage();
	await page.setContent(html(spec), { waitUntil: "networkidle0" });

	// Explicitly wait for the Gosling component to appear
	await page.waitForSelector(".gosling-component", { timeout: 10000 });
	await page.waitForTimeout(5000);  // Extra delay for rendering

	// Capture screenshot
	let component = await page.waitForSelector(".gosling-component");
	let buffer = await component.screenshot(opts);
	await browser.close();
	return buffer;
}

async function processFile(file, outputDir, fileType) {
	const outputPath = path.join(
		outputDir,
		`${path.parse(file).name}.${fileType}`,
	);
	try {
		let spec = await fs.promises.readFile(file, "utf8");
		// to use escape characters as pure text (e.g., separator: '\t') in `.setContent()`
		spec = spec.replaceAll("\\", "\\\\");
		await screenshot(spec, { path: outputPath });
		console.log(`Generated ${outputPath}`);
	} catch (err) {
		console.error(`Error processing ${file}:`, err);
	}
}

async function processFiles(inputDir, outputDir, fileType) {
	if (outputDir === null) {
		console.error("--outdir required to process a directory.");
		process.exit(1);
	}
	try {
		// Create output directory if it doesn't exist
		await fs.promises.mkdir(outputDir, { recursive: true });

		// Read all files from input directory
		const files = await fs.promises.readdir(inputDir, { withFileTypes: true });

		// Process each JSON file
		for (const file of files) {
			if (file.isFile() && file.name.endsWith(".json")) {
				const inputPath = path.join(inputDir, file.name);
				await processFile(inputPath, outputDir, fileType);
			}
		}
	} catch (err) {
		console.error("Error:", err);
		process.exit(1);
	}
}

// Command line argument parsing
const args = util.parseArgs({
	allowPositionals: true,
	options: {
		format: { type: "string" }, // --format=png
		outdir: { type: "string" }, // --outdir=output-images
	},
});

if (args.positionals.length !== 1) {
	console.error(`Usage: node gosling-screenshot.js [options] <input>

Options:
  --format=[png|jpeg|webp] Output image format (default: png)
  --outdir=<directory>     Directory to save the output image
                            (required if input is a directory, optional otherwise)

Arguments:
  input                    A Gosling specification file (JSON) or a directory of specifications`);
	process.exit(1);
}

const input = path.resolve(args.positionals[0]);
const fileType = args.values.format ?? "png";
const outputDir = args.values.outdir ?? null;

// Validate file type
const validFileTypes = ["png", "jpeg", "webp"];
if (!validFileTypes.includes(fileType)) {
	console.error(
		`Invalid file type. Supported types are: ${validFileTypes.join(", ")}`,
	);
	process.exit(1);
}

const main = fs.statSync(input).isDirectory()
	? () => processFiles(input, outputDir, fileType)
	: () => processFile(input, outputDir ?? path.dirname(input), fileType);

main()
	.then(() => console.log("Processing complete!"))
	.catch((err) => {
		console.error("Error:", err);
		process.exit(1);
	});