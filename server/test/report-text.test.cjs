const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  extractReportText,
  safeReportName,
  MAX_REPORT_TEXT_LENGTH,
} = require("../dist/utils/reportText.js");

function createTextPdf(text) {
  const stream = `BT /F1 12 Tf 10 100 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

test("extracts and bounds UTF-8 text reports without changing clinical values", async () => {
  const content = "Collected: 2026-10-07\nHemoglobin: 12.4 g/dL";
  const extracted = await extractReportText({
    buffer: Buffer.from(content, "utf8"),
    mimetype: "text/plain",
    originalname: "sample.txt",
  });
  assert.equal(extracted, content);
});

test("rejects unsupported report formats and invalid UTF-8", async () => {
  await assert.rejects(
    extractReportText({
      buffer: Buffer.from("not an image workflow"),
      mimetype: "image/png",
      originalname: "report.png",
    }),
    /PDF, TXT, or CSV/i,
  );
  await assert.rejects(
    extractReportText({
      buffer: Buffer.from([0xc3, 0x28]),
      mimetype: "text/plain",
      originalname: "report.txt",
    }),
    /UTF-8/i,
  );
});

test("extracts selectable text from a PDF report", async () => {
  const extracted = await extractReportText({
    buffer: createTextPdf("Hemoglobin 12.4 g/dL"),
    mimetype: "application/pdf",
    originalname: "sample.pdf",
  });
  assert.match(extracted, /Hemoglobin 12\.4 g\/dL/);
});

test("rejects empty report text and bounds extracted content", async () => {
  await assert.rejects(
    extractReportText({
      buffer: Buffer.from("   "),
      mimetype: "text/plain",
      originalname: "empty.txt",
    }),
    /No selectable text/i,
  );
  const extracted = await extractReportText({
    buffer: Buffer.from("x".repeat(MAX_REPORT_TEXT_LENGTH + 50)),
    mimetype: "text/plain",
    originalname: "long.txt",
  });
  assert.equal(extracted.length, MAX_REPORT_TEXT_LENGTH);
});

test("sanitizes report names before saving them with case data", () => {
  assert.equal(safeReportName("C:\\reports\\sample\u0000.csv"), "sample.csv");
  assert.equal(safeReportName(""), "medical-report");
});
