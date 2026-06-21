import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import WordExtractor from "word-extractor";
import { detectDocumentKind } from "@/lib/document-types";

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    if (text?.trim()) return text;
  } catch (e) {
    console.warn("unpdf failed, trying pdf-parse:", e);
  }

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  } catch (e) {
    console.error("pdf-parse failed:", e);
    throw new Error("Не удалось прочитать PDF. Попробуйте сохранить как DOCX или TXT.");
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

async function extractDocText(buffer: Buffer): Promise<string> {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const body = doc.getBody() ?? "";
  if (body.trim()) return body;
  throw new Error("Не удалось извлечь текст из .doc файла. Сохраните как DOCX.");
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

  const normalized = text
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .trim();

  if (!normalized) {
    throw new Error("Документ пустой или текст не удалось извлечь");
  }

  return normalized;
}
