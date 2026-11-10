import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useBrowserPdf } from "./extract-book";

/** Load the bundled PDF.js worker. The UI calls this before reading a file. */
export function prepareBrowserPdf(): void {
  useBrowserPdf(workerUrl);
}
