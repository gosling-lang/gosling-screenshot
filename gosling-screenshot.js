import puppeteer from "puppeteer";
import * as fs from "node:fs/promises";
import path from "path";

/**
 * @param {string} spec
 * @param {{ reactVersion: string, pixijsVersion: string, higlassVersion: string, goslingVersion: string }} pkgOptions
 * @returns {string}
 */
function html(spec, {
	reactVersion = "18",
	pixijsVersion = "6",
	higlassVersion = "1.13.4",
	higlassTextVersion = "0.1.6",
	goslingVersion = "1.0.5",
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
	// await page.waitForTimeout(10000);  // Extra delay for rendering

	// Capture screenshot
	let component = await page.waitForSelector(".gosling-component");
	let buffer = await component.screenshot(opts);
	await browser.close();
	return buffer;
}

async function processFiles(inputDir, outputDir, fileType) {
	try {
		// Create output directory if it doesn't exist
		await fs.mkdir(outputDir, { recursive: true });

		// Read all files from input directory
		const files = await fs.readdir(inputDir);

		// Process each JSON file
		for (const file of files) {
			if (path.extname(file).toLowerCase() === '.json') {
				const inputPath = path.join(inputDir, file);
				const outputPath = path.join(outputDir, `${path.parse(file).name}.${fileType}`);

				// console.log(`Processing ${file}...`); // Uncomment for notifying current processing file

				try {
					let spec = await fs.readFile(inputPath, "utf8");
					// to use escape characters as pure text (e.g., separator: '\t') in `.setContent()`
					spec = spec.replaceAll('\\', '\\\\');
					await screenshot(spec, { path: outputPath });
					console.log(`Generated ${outputPath}`);
				} catch (err) {
					console.error(`Error processing ${file}:`, err);
				}
			}
		}
	} catch (err) {
		console.error("Error:", err);
		process.exit(1);
	}
}

// Command line argument parsing
const args = process.argv.slice(2);

if (args.length < 2) {
	console.error(
		"Usage: node gosling-screenshot.js <input-directory> <output-directory> [file-type]"
	);
	console.error("file-type options: png, jpeg, webp (default: png)");
	process.exit(1);
}

const inputDir = args[0];
const outputDir = args[1];
const fileType = args[2]?.toLowerCase() || 'png';

// Validate file type
const validFileTypes = ['png', 'jpeg', 'webp'];
if (!validFileTypes.includes(fileType)) {
	console.error(`Invalid file type. Supported types are: ${validFileTypes.join(', ')}`);
	process.exit(1);
}

// Process the files
processFiles(inputDir, outputDir, fileType)
	.then(() => console.log('Processing complete!'))
	.catch(err => {
		console.error('Error:', err);
		process.exit(1);
	});
