/**
 * Bulk Gosling Screenshot Generator
 *
 * This script is adapted from the original code found in gosling-screenshot.js.
 * at https://github.com/gosling-lang/gosling-screenshot
 *
 * Modifications include support for batch processing of JSON files, keeping naming convention
 * and output in user-specified image formats.
 */

import puppeteer from "puppeteer";
import * as fs from "node:fs/promises";
import * as path from "path";

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

let inputDir = process.argv[2];     // Input directory with JSON files
let outputDir = process.argv[3];    // Output directory to store images
let outputFormat = process.argv[4]; // Output image format (png, jpeg, webp)

if (!inputDir || !outputDir || !outputFormat) {
    console.error(
        "Usage: node bulk-gosling-screenshot.js <input-directory/> <output-directory/> <format>",
    );
    process.exit(1);
}

// Check that the output format is one of the supported types.
const validFormats = ['png', 'jpeg', 'webp'];
if (!validFormats.includes(outputFormat)) {
    console.error("Invalid output format. Please use 'png', 'jpeg', or 'webp'.");
    process.exit(1);
}

try {
    const files = await fs.readdir(inputDir);

    await fs.mkdir(outputDir, { recursive: true });

    for (const file of files) {
        const inputFilePath = path.join(inputDir, file);
        const fileStat = await fs.stat(inputFilePath);

        if (fileStat.isFile() && path.extname(file) === '.json') {
            try {
                let spec = await fs.readFile(inputFilePath, "utf8");
                spec = spec.replaceAll('\\', '\\\\');  // escape characters as pure text
                const outputFilePath = path.join(outputDir, `${path.basename(file, '.json')}.${outputFormat}`);

                await screenshot(spec, { path: outputFilePath, type: outputFormat });
                console.log(`Image generated: ${outputFilePath}`);
            } catch (err) {
                console.error(`Error processing file ${file}:`, err);
            }
        } else {
            console.log(`Skipping non-JSON file: ${file}`);
        }
    }
} catch (err) {
    console.error("Error reading the input directory:", err);
}