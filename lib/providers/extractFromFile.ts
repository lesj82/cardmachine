// lib/providers.ts
// import { extractGeneric } from "./parsers/generic";
// import { openaiExtractFromFile } from "./ai-openai";
// import { extractPdfTextFromBytes } from "./parsers/pdfText";

// export type ExtractedFields = {
//   providerGuess: string | null;
//   confidence: number;
//   monthTurnover: number;
//   mix: {
//     debitTurnover: number;
//     creditTurnover: number;
//     businessTurnover: number;
//     internationalTurnover: number;
//     amexTurnover: number;
//     txCount: number;
//   };
//   currentFeesMonthly: number | null;
//   currentFixedMonthly: number;
//   currency?: string; // Added optional currency
// };

// const isPos = (v: any) => typeof v === "number" && isFinite(v) && v > 0;

// export async function extractFromFile(file: Blob): Promise<ExtractedFields> {
//   const aiEnabled = process.env.AI_PROVIDER === "openai";
//   let ai: any = null;

//   const generic = await extractGeneric(file);

//   if (aiEnabled) {
//     try {
//       ai = await openaiExtractFromFile(file);
//     } catch (err) {
//       console.warn("AI primary extract failed, will fall back to generic:", err);
//     }
//   }

//   if (!ai) {
//     return {
//       providerGuess: generic.providerGuess ?? null,
//       confidence: generic.confidence ?? 0.5,
//       monthTurnover: generic.monthTurnover ?? 0,
//       mix: generic.mix,
//       currentFeesMonthly: generic.currentFeesMonthly ?? null,
//       currentFixedMonthly: generic.currentFixedMonthly ?? 0,
//       currency: generic.currency,
//     };
//   }

//   // Merge fields (AI primary, generic fallback)
//   const aiMonth = Number(ai.monthTurnover || 0);
//   const genMonth = Number(generic.monthTurnover || 0);
//   const monthTurnover = isPos(aiMonth)
//     ? aiMonth
//     : isPos(genMonth)
//     ? genMonth
//     : 0;

//   const aiTx = Number(ai.mix?.txCount || 0);
//   const genTx = Number(generic.mix?.txCount || 0);
//   const txCount = isPos(aiTx)
//     ? aiTx
//     : isPos(genTx)
//     ? genTx
//     : 0;

//   const aiFees = ai.currentFeesMonthly ?? null;
//   const genFees = generic.currentFeesMonthly ?? null;
//   const currentFeesMonthly = isPos(aiFees)
//     ? aiFees
//     : isPos(genFees)
//     ? genFees
//     : null;

//   const aiFix = ai.currentFixedMonthly ?? null;
//   const genFix = generic.currentFixedMonthly ?? null;
//   const currentFixedMonthly = isPos(aiFix)
//     ? aiFix
//     : isPos(genFix)
//     ? genFix
//     : 0;

//   const providerGuess = ai.providerGuess ?? generic.providerGuess ?? null;
//   const currency = ai.currency ?? generic.currency ?? "GBP"; // Default to GBP if not detected

//   // Mix logic
//   const aiMix = ai.mix || {};
//   const genMix = generic.mix || {};

//   const amexTurnover = isPos(aiMix.amexTurnover)
//     ? aiMix.amexTurnover
//     : isPos(genMix.amexTurnover)
//     ? genMix.amexTurnover
//     : 0;

//   const detailed =
//     isPos(aiMix.debitTurnover) ||
//     isPos(aiMix.creditTurnover) ||
//     isPos(aiMix.businessTurnover) ||
//     isPos(aiMix.internationalTurnover);

//   const mix = detailed
//     ? {
//         debitTurnover: Number(aiMix.debitTurnover || 0),
//         creditTurnover: Number(aiMix.creditTurnover || 0),
//         businessTurnover: Number(aiMix.businessTurnover || 0),
//         internationalTurnover: Number(aiMix.internationalTurnover || 0),
//         amexTurnover,
//         txCount,
//       }
//     : (() => {
//         const other = Math.max(0, (monthTurnover || 0) - amexTurnover);
//         return {
//           debitTurnover: other * 0.5,
//           creditTurnover: other * 0.5,
//           businessTurnover: 0,
//           internationalTurnover: 0,
//           amexTurnover,
//           txCount,
//         };
//       })();

//   // Confidence scoring
//   let confidence = 0.8;

//   if (isPos(aiMonth) && isPos(genMonth)) {
//     const rel = Math.abs(aiMonth - genMonth) / Math.max(1, genMonth);
//     if (rel < 0.05) confidence += 0.1;
//     else if (rel < 0.1) confidence += 0.05;
//   }

//   if (
//     isPos(aiFees) &&
//     isPos(genFees) &&
//     Math.abs((aiFees as number) - (genFees as number)) < 1
//   ) {
//     confidence += 0.05;
//   }

//   if (aiTx === genTx && aiTx > 0) confidence += 0.05;

//   // Reduce confidence if AI might have estimated from annual data
//   if (
//     aiMonth > 0 &&
//     generic.monthTurnover === 0 &&
//     /annual|12 months/i.test(
//       await extractPdfTextFromBytes(new Uint8Array(await file.arrayBuffer()))
//     )
//   ) {
//     confidence -= 0.1;
//   }

//   confidence = Math.min(1, confidence);

//   return {
//     providerGuess,
//     confidence,
//     monthTurnover,
//     mix,
//     currentFeesMonthly,
//     currentFixedMonthly,
//     currency,
//   };
// }

// // chatgpt-4o-mini
// "use server";

// import Tesseract from "tesseract.js";
// import OpenAI from "openai";
// import { extractText as unpdfExtractText } from "unpdf";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY!,
// });

// export type ExtractedFields = {
//   providerGuess: string | null;
//   confidence: number;
//   monthTurnover: number;
//   mix: {
//     debitTurnover: number;
//     creditTurnover: number;
//     businessTurnover: number;
//     internationalTurnover: number;
//     amexTurnover: number;
//     txCount: number;
//   };
//   currentFeesMonthly: number | null;
//   currentFixedMonthly: number;
//   currency?: string;
// };

// export async function extractFromFile(file: Blob): Promise<ExtractedFields> {
//   const arrayBuffer = await file.arrayBuffer();
//   const uint8 = new Uint8Array(arrayBuffer);

//   const rawText = await extractText(uint8, file.type);
//   const fields = await extractUsingAI(rawText);

//   return normalizeExtracted(fields);
// }

// /* ---------------------------------------------
//  * TEXT EXTRACTION (PDF + IMAGE)
//  * ------------------------------------------- */
// async function extractText(uint8: Uint8Array, mime: string): Promise<string> {
//   try {
//     if (mime.includes("pdf")) {
//       return await extractFromPDF(uint8);
//     }
//     return await extractFromImage(uint8);
//   } catch (err) {
//     console.error("Failed to extract text:", err);
//     return "";
//   }
// }

// async function extractFromPDF(uint8: Uint8Array): Promise<string> {
//   try {
//     const result: any = await unpdfExtractText(uint8);

//     // Normalize
//     let text = "";

//     if (!result) text = "";
//     else if (typeof result === "string") text = result;
//     else if (typeof result.text === "string") text = result.text;
//     else if (Array.isArray(result.pages)) text = result.pages.join(" ");
//     else if (Array.isArray(result)) text = result.join(" ");
//     else text = "";

//     return (text || "").trim();
//   } catch (err) {
//     console.error("UNPDF extraction error:", err);
//     return "";
//   }
// }

// async function extractFromImage(uint8: Uint8Array): Promise<string> {
//   try {
//     const buf = Buffer.from(uint8);
//     const res = await Tesseract.recognize(buf, "eng");
//     return res.data.text || "";
//   } catch (err) {
//     console.error("OCR error:", err);
//     return "";
//   }
// }

// /* ---------------------------------------------
//  * AI EXTRACTION
//  * ------------------------------------------- */
// async function extractUsingAI(text: string): Promise<any> {
//   const prompt = `
// Extract structured merchant statement fields.

// Return ONLY valid JSON:

// {
//   "providerGuess": string | null,
//   "confidence": number,
//   "monthTurnover": number,
//   "currentFeesMonthly": number,
//   "currentFixedMonthly": number,
//   "mix": {
//     "debitTurnover": number,
//     "creditTurnover": number,
//     "businessTurnover": number,
//     "internationalTurnover": number,
//     "amexTurnover": number,
//     "txCount": number
//   },
//   "currency": string
// }

// TEXT:
// ${text}
// `.trim();

//   try {
//     const res = await client.chat.completions.create({
//       model: "gpt-4o-mini",
//       temperature: 0,
//       response_format: { type: "json_object" },
//       messages: [
//         { role: "system", content: "Return ONLY valid JSON." },
//         { role: "user", content: prompt },
//       ],
//     });

//     return JSON.parse(res.choices[0].message.content ?? "{}");
//   } catch (err) {
//     console.error("AI extraction error:", err);
//     return {
//       providerGuess: null,
//       confidence: 0,
//       monthTurnover: 0,
//       currentFeesMonthly: 0,
//       currentFixedMonthly: 0,
//       mix: {
//         debitTurnover: 0,
//         creditTurnover: 0,
//         businessTurnover: 0,
//         internationalTurnover: 0,
//         amexTurnover: 0,
//         txCount: 0,
//       },
//       currency: "GBP",
//     };
//   }
// }

// /* ---------------------------------------------
//  * NORMALIZATION
//  * ------------------------------------------- */
// function normalizeExtracted(input: any): ExtractedFields {
//   const turnover = Number(input.monthTurnover || 0);
//   const amex = Number(input.mix?.amexTurnover || 0);
//   const tx = Number(input.mix?.txCount || 0);

//   const fallback = !input.mix || (!input.mix.debitTurnover && !input.mix.creditTurnover);
//   const other = turnover - amex;

//   const mix = fallback
//     ? {
//         debitTurnover: other * 0.5,
//         creditTurnover: other * 0.5,
//         businessTurnover: 0,
//         internationalTurnover: 0,
//         amexTurnover: amex,
//         txCount: tx,
//       }
//     : {
//         debitTurnover: Number(input.mix.debitTurnover || 0),
//         creditTurnover: Number(input.mix.creditTurnover || 0),
//         businessTurnover: Number(input.mix.businessTurnover || 0),
//         internationalTurnover: Number(input.mix.internationalTurnover || 0),
//         amexTurnover: Number(input.mix.amexTurnover || 0),
//         txCount: Number(input.mix.txCount || 0),
//       };

//   return {
//     providerGuess: input.providerGuess ?? null,
//     confidence: Number(input.confidence ?? 0.9),
//     monthTurnover: turnover,
//     currentFeesMonthly: Number(input.currentFeesMonthly || 0),
//     currentFixedMonthly: Number(input.currentFixedMonthly || 0),
//     mix,
//     currency: input.currency || "GBP",
//   };
// }

//gemini-1.5-flash
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractText as unpdfExtractText } from "unpdf";
import Tesseract from "tesseract.js";

/* -------------------------------------------------------
 *  INIT GEMINI CLIENT
 * ----------------------------------------------------- */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

/* -------------------------------------------------------
 *  TYPES
 * ----------------------------------------------------- */
export type ExtractedFields = {
  providerGuess: string | null;
  confidence: number;
  monthTurnover: number;
  mix: {
    debitTurnover: number;
    creditTurnover: number;
    businessTurnover: number;
    internationalTurnover: number;
    amexTurnover: number;
    txCount: number;
  };
  currentFeesMonthly: number | null;
  currentFixedMonthly: number;
  currency?: string;
};

/* -------------------------------------------------------
 *  ENTRY FUNCTION
 * ----------------------------------------------------- */
export async function extractFromFile(file: Blob): Promise<ExtractedFields> {
  const buffer = new Uint8Array(await file.arrayBuffer()); // IMPORTANT for unpdf
  const rawText = await extractText(buffer, file.type);

  const fields = await extractUsingGemini(rawText);

  return normalizeExtracted(fields);
}

/* -------------------------------------------------------
 *  TEXT EXTRACTION HANDLER
 * ----------------------------------------------------- */
async function extractText(buffer: Uint8Array, mime: string): Promise<string> {
  try {
    if (mime.includes("pdf")) return await extractFromPDF(buffer);
    return await extractFromImage(Buffer.from(buffer));
  } catch (err) {
    console.error("Text extraction failed:", err);
    return "";
  }
}

/* -------------------------------------------------------
 *  PDF TO TEXT (UNPDF)
 * ----------------------------------------------------- */
async function extractFromPDF(buffer: Uint8Array): Promise<string> {
  try {
    const result: any = await unpdfExtractText(buffer);

    let text = "";

    if (!result) text = "";
    else if (typeof result === "string") text = result;
    else if (typeof result.text === "string") text = result.text;
    else if (Array.isArray(result.pages)) text = result.pages.join(" ");
    else if (Array.isArray(result)) text = result.join(" ");
    else text = JSON.stringify(result);

    return text.trim();
  } catch (err) {
    console.error("UNPDF extraction error:", err);
    return "";
  }
}

/* -------------------------------------------------------
 *  OCR FOR IMAGE FILES
 * ----------------------------------------------------- */
async function extractFromImage(buffer: Buffer): Promise<string> {
  try {
    const result = await Tesseract.recognize(buffer, "eng");
    return result.data.text || "";
  } catch (err) {
    console.error("OCR extraction error:", err);
    return "";
  }
}

/* -------------------------------------------------------
 *  GEMINI AI EXTRACTION
 * ----------------------------------------------------- */
async function extractUsingGemini(text: string): Promise<any> {
  const prompt = `
Extract the following fields from the merchant card processing statement.

Return ONLY valid JSON exactly in this format:

{
  "providerGuess": string | null,
  "confidence": number,
  "monthTurnover": number,
  "currentFeesMonthly": number,
  "currentFixedMonthly": number,
  "mix": {
    "debitTurnover": number,
    "creditTurnover": number,
    "businessTurnover": number,
    "internationalTurnover": number,
    "amexTurnover": number,
    "txCount": number
  },
  "currency": string
}

RULES:
- Use the current billing period only (monthly).
- Ignore annual summaries unless no monthly data exists.
- If mix missing, apply fallback:
    amexTurnover = extracted or 0
    other = monthTurnover - amexTurnover
    debitTurnover = creditTurnover = other * 0.5
    businessTurnover = 0
    internationalTurnover = 0
    txCount = total txCount

TEXT TO ANALYSE:
----------------
${text}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text();

    // Some Gemini responses wrap JSON inside markdown — remove fences
    const clean = raw.replace(/```json|```/g, "").trim();

    return JSON.parse(clean);
  } catch (err) {
    console.error("Gemini extraction error:", err);

    return {
      providerGuess: null,
      confidence: 0,
      monthTurnover: 0,
      currentFeesMonthly: 0,
      currentFixedMonthly: 0,
      mix: {
        debitTurnover: 0,
        creditTurnover: 0,
        businessTurnover: 0,
        internationalTurnover: 0,
        amexTurnover: 0,
        txCount: 0,
      },
      currency: "GBP",
    };
  }
}

/* -------------------------------------------------------
 *  NORMALIZE OUTPUT
 * ----------------------------------------------------- */
function normalizeExtracted(input: any): ExtractedFields {
  const turnover = Number(input.monthTurnover || 0);
  const amex = Number(input.mix?.amexTurnover || 0);
  const tx = Number(input.mix?.txCount || 0);

  const needsFallback =
    !input.mix ||
    (!input.mix.debitTurnover && !input.mix.creditTurnover);

  let mix;

  if (needsFallback) {
    const other = turnover - amex;

    mix = {
      debitTurnover: other * 0.5,
      creditTurnover: other * 0.5,
      businessTurnover: 0,
      internationalTurnover: 0,
      amexTurnover: amex,
      txCount: tx,
    };
  } else {
    mix = {
      debitTurnover: Number(input.mix.debitTurnover || 0),
      creditTurnover: Number(input.mix.creditTurnover || 0),
      businessTurnover: Number(input.mix.businessTurnover || 0),
      internationalTurnover: Number(input.mix.internationalTurnover || 0),
      amexTurnover: Number(input.mix.amexTurnover || 0),
      txCount: Number(input.mix.txCount || 0),
    };
  }

  return {
    providerGuess: input.providerGuess ?? null,
    confidence: Number(input.confidence ?? 0.9),
    monthTurnover: turnover,
    currentFeesMonthly: Number(input.currentFeesMonthly || 0),
    currentFixedMonthly: Number(input.currentFixedMonthly || 0),
    mix,
    currency: input.currency || "GBP",
  };
}
