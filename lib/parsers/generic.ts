// lib/parsers/generic.ts
import { extractPdfTextFromBytes } from "./pdfText";

function clean(s: string) {
  return s.replace(/[,£$€¥₹]/g, "").trim(); // Expanded to remove more currency symbols
}

function findMoneyInText(text: string, re: RegExp) {
  const m = text.match(re);
  if (!m) return null;
  return parseFloat(clean(m[1]));
}

export async function extractGeneric(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type || "application/pdf";

  let text = "";

  if (mime === "application/pdf") {
    try {
      text = await extractPdfTextFromBytes(bytes);
    } catch (e) {
      console.warn("Generic PDF parse failed:", e);
      text = "";
    }
  }

  // If no text yet, try OCR via OpenAI image input (simple)
  if (!text.trim()) {
    try {
      const base64 = Buffer.from(bytes).toString("base64");
      const API_KEY = process.env.OPENAI_API_KEY;
      if (!API_KEY) throw new Error("Missing OPENAI_API_KEY for OCR fallback");

      const visionReq = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Extract plain text only from the supplied image. Return only the extracted text.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: `data:${mime};base64,${base64}` },
                  },
                ],
              },
            ],
            max_tokens: 2500,
          }),
        }
      );

      const out = await visionReq.json();
      text = out?.choices?.[0]?.message?.content || "";
    } catch (e) {
      console.warn("Generic OCR failed:", e);
      text = "";
    }
  }

  // -------------------------------------------------
  //  Regex-based extraction (expanded for global)
  // -------------------------------------------------
  const providerGuess =
    /dojo|paymentsense/i.test(text) ? "Dojo" :
    /global payments/i.test(text) ? "Global Payments" :
    /elavon/i.test(text) ? "Elavon" :
    /barclaycard/i.test(text) ? "Barclaycard" :
    /worldpay/i.test(text) ? "Worldpay" :
    /stripe/i.test(text) ? "Stripe" :
    /square/i.test(text) ? "Square" :
    /paypal/i.test(text) ? "PayPal" :
    /adyen/i.test(text) ? "Adyen" :
    /evo/i.test(text) ? "EVO" :
    /tide/i.test(text) ? "Tide" :
    null;

  let monthTurnover =
    findMoneyInText(
      text,
      /Total value of transactions[^0-9]([0-9,]+\.\d{2})/i
    ) ||
    findMoneyInText(text, /Total sales[^0-9]([0-9,]+\.\d{2})/i) ||
    findMoneyInText(text, /Card turnover[^0-9]([0-9,]+\.\d{2})/i) ||
    findMoneyInText(
      text,
      /Total value of[\s]transactions\s([\d,]+\.\d{2})/i
    ) || // Added for Dojo-like
    (findMoneyInText(
      text,
      /Total card transactions in the last[^0-9]([0-9,]+\.\d{2})/i
    ) || 0) / 12 || // Annual fallback divide by 12
    findMoneyInText(text, /Monthly Turnover[^0-9]([0-9,]+\.\d{2})/i) || // Global addition
    findMoneyInText(text, /Processing Volume[^0-9]([0-9,]+\.\d{2})/i) || // e.g., Stripe
    0;

  const txCountRaw =
    text.match(/Total number of transactions[^0-9]*([0-9,]+)/i)?.[1] ||
    text.match(/Number of[\s]transactions\s([\d,]+)/i)?.[1]; // Added

  const txCount = txCountRaw ? parseInt(clean(txCountRaw)) : 0;

  const currentFeesMonthly =
    findMoneyInText(text, /Total charges[^0-9]([0-9,]+\.\d{2})/i) ||
    findMoneyInText(text, /Net amount[^0-9]([0-9,]+\.\d{2})/i) ||
    findMoneyInText(text, /Card processing fees[^0-9]([0-9,]+\.\d{2})/i) ||
    findMoneyInText(
      text,
      /Total transaction fees and charges[^0-9]([0-9,]+\.\d{2})/i
    ) || // Dojo
    findMoneyInText(text, /Total Fees[^0-9]*([0-9,]+\.\d{2})/i) || // Global
    null;

  let currentFixedMonthly = 0;

  [
    /terminal rental[^0-9]([0-9,]+\.\d{2})/i,
    /pci (?:fee|charge)[^0-9]([0-9,]+\.\d{2})/i,
    /statement fee[^0-9]([0-9,]+\.\d{2})/i,
    /minimum monthly[^0-9]([0-9,]+\.\d{2})/i,
    /monthly fee[^0-9]([0-9,]+\.\d{2})/i,
    /Card machine & account services[^0-9]([0-9,]+\.\d{2})/i, // Dojo
    /Other fees[^0-9]*([0-9,]+\.\d{2})/i, // Global
  ].forEach((re) => {
    const v = findMoneyInText(text, re);
    if (v) currentFixedMonthly += v;
  });

  const debitTurnover =
    findMoneyInText(text, /Visa Debit(?:[^0-9]+)([0-9,]+\.\d{2})/i) ||
    findMoneyInText(text, /Mastercard Debit(?:[^0-9]+)([0-9,]+\.\d{2})/i) ||
    findMoneyInText(text, /Debit cards(?:[^0-9]+)([0-9,]+\.\d{2})/i) || // Dojo
    0;

  const creditTurnover =
    findMoneyInText(text, /Visa Credit(?:[^0-9]+)([0-9,]+\.\d{2})/i) ||
    findMoneyInText(text, /Mastercard Credit(?:[^0-9]+)([0-9,]+\.\d{2})/i) ||
    findMoneyInText(text, /Credit cards(?:[^0-9]+)([0-9,]+\.\d{2})/i) || // Dojo
    0;

  const businessTurnover =
    findMoneyInText(text, /Business(?:[^0-9]+)([0-9,]+\.\d{2})/i) ||
    findMoneyInText(
      text,
      /Other business cards(?:[^0-9]+)([0-9,]+\.\d{2})/i
    ) || // Dojo
    0;

  const internationalTurnover =
    findMoneyInText(text, /International(?:[^0-9]+)([0-9,]+\.\d{2})/i) ||
    findMoneyInText(
      text,
      /International cards(?:[^0-9]+)([0-9,]+\.\d{2})/i
    ) || // Dojo
    0;

  const amexTurnover =
    findMoneyInText(text, /American Express(?:[^0-9]+)([0-9,]+\.\d{2})/i) ||
    findMoneyInText(
      text,
      /American Express cards(?:[^0-9]+)([0-9,]+\.\d{2})/i
    ) || // Dojo
    0;

  // Fallback: if top-level monthTurnover missing, sum components
  if (!monthTurnover) {
    const sum =
      debitTurnover +
      creditTurnover +
      businessTurnover +
      internationalTurnover +
      amexTurnover;
    if (sum > 0) monthTurnover = sum;
  }

  const hasDetail =
    debitTurnover ||
    creditTurnover ||
    businessTurnover ||
    internationalTurnover;

  const mix = hasDetail
    ? {
        debitTurnover,
        creditTurnover,
        businessTurnover,
        internationalTurnover,
        amexTurnover,
        txCount,
      }
    : (() => {
        const other = Math.max(0, monthTurnover - amexTurnover);
        return {
          debitTurnover: other * 0.5,
          creditTurnover: other * 0.5,
          businessTurnover: 0,
          internationalTurnover: 0,
          amexTurnover,
          txCount,
        };
      })();

  // Detect currency (simple regex)
  const currencyMatch = text.match(/([£$€¥₹])/);
  const currency = currencyMatch
    ? currencyMatch[1] === "£"
      ? "GBP"
      : currencyMatch[1] === "$"
      ? "USD"
      : currencyMatch[1] === "€"
      ? "EUR"
      : "UNKNOWN"
    : "GBP";

  return {
    providerGuess,
    confidence: 0.5,
    monthTurnover,
    mix,
    currentFeesMonthly,
    currentFixedMonthly,
    currency,
  };
}
