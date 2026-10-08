import { PDFParse } from "pdf-parse";

export const MAX_REPORT_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_REPORT_TEXT_LENGTH = 12_000;
const MAX_REPORT_PAGES = 10;

export type UploadedReport = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

export function safeReportName(value: string) {
  const leafName = value.split(/[\\/]/).pop() || "medical-report";
  return leafName.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120);
}

export async function extractReportText(file: UploadedReport) {
  const extension = safeReportName(file.originalname).toLowerCase().split(".").pop();
  let text: string;

  if (extension === "pdf" && file.mimetype === "application/pdf") {
    if (!file.buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
      throw new Error("The uploaded file is not a valid PDF.");
    }

    const parser = new PDFParse({ data: file.buffer });
    try {
      const info = await parser.getInfo();
      if (info.total > MAX_REPORT_PAGES) {
        throw new Error("PDF reports must contain 10 pages or fewer.");
      }
      text = (await parser.getText({ first: MAX_REPORT_PAGES })).text;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PDF reports must contain 10 pages or fewer."
      ) {
        throw error;
      }
      throw new Error("Unable to extract text from this PDF. It may be encrypted or damaged.");
    } finally {
      await parser.destroy();
    }
  } else if (
    ["txt", "csv"].includes(extension || "") &&
    ["text/plain", "text/csv", "application/vnd.ms-excel"].includes(file.mimetype)
  ) {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
    } catch {
      throw new Error("Text reports must use UTF-8 encoding.");
    }
  } else {
    throw new Error("Upload a PDF, TXT, or CSV report. Scanned PDFs and images are not supported.");
  }

  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    throw new Error("No selectable text was found. Scanned PDFs are not supported.");
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(normalized)) {
    throw new Error("The report contains unsupported binary or control characters.");
  }

  return normalized.slice(0, MAX_REPORT_TEXT_LENGTH);
}
