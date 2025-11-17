// lib/parsers/pdfText.ts
import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfTextFromBytes(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text || "";
  } catch (err) {
    console.error("UNPDF extraction failed:", err);
    throw new Error("Unable to extract PDF text");
  }
}
