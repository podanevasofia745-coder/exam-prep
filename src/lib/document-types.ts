export type DocumentKind = "pdf" | "docx" | "doc";

export function detectDocumentKind(filename: string, mimeType = ""): DocumentKind | null {
  const name = filename.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (name.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (name.endsWith(".doc") || mime === "application/msword") return "doc";

  return null;
}

export function isDocumentFile(file: File): boolean {
  return detectDocumentKind(file.name, file.type) !== null;
}
