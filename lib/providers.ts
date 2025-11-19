import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import OpenAI from "openai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { Mix } from "@/lib/pricing";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedFields {
  monthTurnover: number;
  mix: Mix;
  currentFeesMonthly: number | null;
  currentFixedMonthly: number;
  providerGuess: string;
}

// Only handles PDFs on Server
export async function extractFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  if (!fileName.endsWith(".pdf") && file.type !== "application/pdf") {
     throw new Error("Server only handles PDFs. Images must be processed on client.");
  }

  const tempDir = os.tmpdir();
  const safeName = fileName.replace(/[^a-z0-9.]/gi, "_");
  const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${safeName}`);

  try {
    await fs.writeFile(tempFilePath, buffer);
    const loader = new PDFLoader(tempFilePath, { splitPages: false });
    const docs = await loader.load();
    const fullText = docs.map((doc) => doc.pageContent).join("\n\n");

    if (!fullText.trim() || fullText.length < 50) {
      throw new Error("PDF text is empty. It might be a scanned image PDF.");
    }
    return fullText;
  } catch (error) {
    console.error("PDF Extraction failed:", error);
    throw error;
  } finally {
    try { await fs.unlink(tempFilePath); } catch (e) {}
  }
}

// Analyzes Text (Shared by both PDF and Client-side OCR text)
export async function analyzeTextWithOpenAI(text: string): Promise<ExtractedFields> {
  const SYSTEM_PROMPT = `You are an expert financial auditor specializing in UK Merchant Services Statements.

Your goal is to extract a **SINGLE MONTH'S** financial data.

Return a JSON object with EXACTLY this structure:
{
  "_thought_process": "Explain logic here...",
  "monthTurnover": number,       
  "currentFeesMonthly": number,  
  "currentFixedMonthly": number, 
  "providerGuess": string,       
  "mix": {
      "debitTurnover": number,
      "creditTurnover": number,
      "businessTurnover": number,
      "internationalTurnover": number,
      "amexTurnover": number,
      "txCount": number         
  }
}

**STRATEGY FOR EXTRACTION:**

**PRIORITY 1: Explicit Monthly Data**
- Look for "01/MM/YYYY - 31/MM/YYYY".
- Use "Total Turnover" and "Total Charges" from this section.
- **Worldpay Warning:** If "Last 12 Months" and "Current Month" are side-by-side, USE "CURRENT MONTH".

**PRIORITY 2: Annual Estimation (Fallback)**
- **IF AND ONLY IF** monthly totals are missing/zero:
- Find "Total transactions last 12 months".
- **CALCULATION:** Annual Turnover / 12.
- **CALCULATION:** Annual Charges / 12.
- Note this in "_thought_process".

**DEFAULTS (If specific breakdown is missing):**
- **Mix:** Assume a standard consumer profile:
  - Debit: 90%
  - Credit: 10%
  - Business/Intl/Amex: 0% (Only include if explicitly found).
- **TxCount:** If missing, estimate: Turnover / 50 (Assumes £50 Average Transaction Value).

IMPORTANT: Return ONLY raw numbers.`;

  const truncatedText = text.slice(0, 100000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o", 
    temperature: 0, 
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this extracted text:\n\n${truncatedText}` }
    ]
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("AI response was empty");

  let raw: any;
  try {
    raw = JSON.parse(content);
  } catch (e) {
    throw new Error("AI did not return valid JSON");
  }

  if (raw._thought_process) console.log("AI Reasoning:", raw._thought_process);

  const n = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const clean = val.replace(/[^0-9.-]/g, '');
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  return {
    monthTurnover: n(raw.monthTurnover),
    currentFeesMonthly: n(raw.currentFeesMonthly),
    currentFixedMonthly: n(raw.currentFixedMonthly),
    providerGuess: raw.providerGuess || "Unknown",
    mix: {
      debitTurnover: n(raw.mix?.debitTurnover),
      creditTurnover: n(raw.mix?.creditTurnover),
      businessTurnover: n(raw.mix?.businessTurnover),
      internationalTurnover: n(raw.mix?.internationalTurnover),
      amexTurnover: n(raw.mix?.amexTurnover),
      txCount: n(raw.mix?.txCount) || 1,
    }
  };
}