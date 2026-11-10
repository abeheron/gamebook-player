import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { demoSystem } from "../src/format/demo";
import { convertBytes, useNodePdf } from "../src/format/extract-book";
import { countDraft, formatCounts } from "../src/format/structure-book";

const file = process.argv[2];
if (!file) {
  process.stderr.write("Usage: npm run convert:check -- <file>\n");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const worker = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
const fonts = new URL("./", pathToFileURL(require.resolve("pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf"))).href;
useNodePdf(worker, fonts);

const result = await convertBytes(readFileSync(file), basename(file), demoSystem);
if (!result.ok) {
  process.stderr.write(`${result.error}\n`);
  process.exit(1);
}
process.stdout.write(`${formatCounts(countDraft(result.draft))}\n`);
