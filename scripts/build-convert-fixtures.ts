import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";

const root = resolve(import.meta.dirname, "../tests/fixtures/convert");
const pages = readFileSync(resolve(root, "copper-lantern.txt"), "utf8").split("\f");

mkdirSync(root, { recursive: true });

const pdf = await PDFDocument.create();
pdf.setTitle("The Copper Lantern");
pdf.setAuthor("Original sample");
const font = await pdf.embedFont(StandardFonts.Helvetica);
for (const pageText of pages) {
  const page = pdf.addPage([612, 792]);
  let y = 740;
  for (const line of pageText.split("\n")) {
    const text = line.trim();
    if (!text) {
      y -= 16;
      continue;
    }
    const size = /^\d{1,4}\.$/.test(text) ? 16 : 12;
    const width = font.widthOfTextAtSize(text, size);
    const x = /^\d{1,4}\.$/.test(text) ? (612 - width) / 2 : 72;
    page.drawText(text, { x, y, size, font });
    y -= 22;
  }
}
writeFileSync(resolve(root, "copper-lantern.pdf"), await pdf.save());

const blank = await PDFDocument.create();
blank.addPage([612, 792]);
writeFileSync(resolve(root, "scanned.pdf"), await blank.save());
writeFileSync(resolve(root, "unreadable.bin"), Buffer.from("this is not a book file\n"));

const epubPages = pages.map((page) =>
  page
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeXml(line)}</p>`)
    .join("\n"),
);
await writeEpub(resolve(root, "paper-moth.epub"), "The Paper Moth", epubPages, false);
await writeEpub(resolve(root, "protected.epub"), "Locked sample", ["<p>Locked.</p>"], true);

async function writeEpub(path: string, title: string, bodies: string[], locked: boolean): Promise<void> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  );
  if (locked) {
    zip.file("META-INF/encryption.xml", `<?xml version="1.0" encoding="UTF-8"?><encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"/>`);
  }
  const items = bodies
    .map((_, index) => `<item id="p${index + 1}" href="p${index + 1}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("");
  const spine = bodies.map((_, index) => `<itemref idref="p${index + 1}"/>`).join("");
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="id">original-sample</dc:identifier>
<dc:title>${escapeXml(title)}</dc:title>
<dc:creator>Original sample</dc:creator>
<dc:language>en</dc:language>
</metadata>
<manifest>${items}</manifest>
<spine>${spine}</spine>
</package>`,
  );
  bodies.forEach((body, index) => {
    zip.file(
      `OEBPS/p${index + 1}.xhtml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(title)}</title></head><body>
${body}
</body></html>`,
    );
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, await zip.generateAsync({ type: "nodebuffer" }));
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
