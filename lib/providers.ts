// lib/providers.ts
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import OpenAI from "openai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createWorker } from "tesseract.js";
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

export async function extractFromFile(file: File): Promise<ExtractedFields> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();
  const fileType = file.type || "";

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return await processPdf(buffer, fileName);
  } else if (
    fileType.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp)$/.test(fileName)
  ) {
    return await processImageWithTesseract(buffer);
  } else {
    throw new Error("Unsupported file type. Please upload a PDF or Image (JPG, PNG).");
  }
}

// --- PDF Handling ---
async function processPdf(buffer: Buffer, originalName: string): Promise<ExtractedFields> {
  const tempDir = os.tmpdir();
  const safeName = originalName.replace(/[^a-z0-9.]/gi, "_");
  const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${safeName}`);

  try {
    await fs.writeFile(tempFilePath, buffer);
    const loader = new PDFLoader(tempFilePath, { splitPages: false });
    const docs = await loader.load();
    const fullText = docs.map((doc) => doc.pageContent).join("\n\n");

    if (!fullText.trim() || fullText.length < 50) {
      throw new Error("PDF text is empty/scanned.");
    }
    return await analyzeTextWithOpenAI(fullText);
  } catch (error) {
    console.error("PDF Extraction failed:", error);
    throw error;
  } finally {
    try { await fs.unlink(tempFilePath); } catch (e) {}
  }
}

// --- Image Handling (Tesseract v5) ---
async function processImageWithTesseract(buffer: Buffer): Promise<ExtractedFields> {
  console.log("Starting OCR with Tesseract...");
  let worker;
  try {
    worker = await createWorker("eng");
    const ret = await worker.recognize(buffer);
    const rawText = ret.data.text;
    
    console.log("OCR Text Length:", rawText.length);

    if (!rawText.trim() || rawText.length < 20) {
        throw new Error("OCR extracted insufficient text.");
    }

    return await analyzeTextWithOpenAI(rawText);
  } catch (error) {
    console.error("Tesseract OCR failed:", error);
    throw error;
  } finally {
    if (worker) await worker.terminate();
  }
}

// --- AI Analysis ---

const SYSTEM_PROMPT = `You are an expert financial auditor specializing in UK Merchant Services Statements.

Your goal is to extract a **SINGLE MONTH'S** financial data.

Return a JSON object with EXACTLY this structure:
{
  "_thought_process": "Explain your logic...",
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

async function analyzeTextWithOpenAI(text: string): Promise<ExtractedFields> {
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

  return parseOpenAIResponse(completion);
}

function parseOpenAIResponse(completion: any): ExtractedFields {
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("AI response was empty");

  let raw: any;
  try {
    raw = JSON.parse(content);
  } catch (e) {
    throw new Error("AI did not return valid JSON");
  }

  if (raw._thought_process) {
    console.log("AI Reasoning:", raw._thought_process);
  }

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