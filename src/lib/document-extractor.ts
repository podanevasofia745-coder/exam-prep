import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import WordExtractor from "word-extractor";
import { detectDocumentKind } from "@/lib/document-types";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

async function extractDocText(buffer: Buffer): Promise<string> {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return doc.getBody() ?? "";
}

export async function extractTextFromDocument(
  buffer: Buffer,
  filename: string,
  mimeType = ""
): Promise<string> {
  const kind = detectDocumentKind(filename, mimeType);

  if (!kind) {
    throw new Error("Неподдерживаемый формат документа");
  }

  let text = "";

  switch (kind) {
    case "pdf":
      text = await extractPdfText(buffer);
      break;
    case "docx":
      text = await extractDocxText(buffer);
      break;
    case "doc":
      text = await extractDocText(buffer);
      break;
  }

  const normalized = text.replace(/\r/g, "\n").trim();
  if (!normalized) {
    throw new Error("Документ пустой или текст не удалось извлечь");
  }

  return normalized;
}
