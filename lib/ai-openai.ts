// lib/ai-openai.ts
import { AiExtractSchema } from "./ai"; // keep your zod schema here
import { extractPdfTextFromBytes } from "./parsers/pdfText";

const SYSTEM =
  "You extract structured finance data from merchant services statements worldwide. Return ONLY valid JSON.";

const INSTRUCTIONS = `
Extract the following fields from the merchant statement. You MUST find the grand total for each, focusing on the current billing/statement period (e.g., monthly). Ignore annual or 12-month summaries unless no period-specific data is available—in that case, estimate monthly by dividing annual by 12 and note it.

Total turnover ("monthTurnover"): total value of ALL transactions for the statement period. Sum breakdowns by card type if no explicit total.
Total transaction count ("txCount"): total number of transactions for the period. Sum if broken down.
Total amount charged in fees by the provider ("currentFeesMonthly"): sum of all variable/transaction fees (exclude fixed if separate).
"providerGuess": short name of the provider (e.g., "Dojo", "Global Payments", "Elavon", "Barclaycard", "Stripe", "Square", "PayPal", "Adyen").
"currentFixedMonthly": sum of fixed monthly fees (e.g., PCI, terminal rental, minimum charges).
"mix": { debitTurnover, creditTurnover, businessTurnover, internationalTurnover, amexTurnover, txCount }. Use absolute volumes if available; if only percentages, apply to monthTurnover.
"currency": detected currency code (e.g., "GBP", "USD", "EUR"). Default to "GBP" if unclear.

MIX FALLBACK RULE:
If detailed mix missing: compute amexTurnover (or 0), otherTurnover = monthTurnover - amexTurnover, debit=credit=other*0.5, business=0, international=0, txCount = total txCount.

Return ONLY valid JSON with top-level keys:
providerGuess
monthTurnover
currentFeesMonthly
currentFixedMonthly
mix
currency
`;

async function callOpenAI(requestBody: any) {
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(
      parseInt(process.env.AI_TIMEOUT_MS || "300000")
    ), // Increased default timeout to 5 min
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("OpenAI API error:", res.status, body);
    throw new Error(`OpenAI error ${res.status}`);
  }

  return res.json();
}

export async function openaiExtractFromFile(file: Blob): Promise<unknown> {
  const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";
  const isPdf = mimeType === "application/pdf";

  // Build messages: instructions first, then statement/input
  let messages: any[] = [{ role: "system", content: SYSTEM }];

  if (isPdf) {
    const extractedText = await extractPdfTextFromBytes(bytes);
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text:
            INSTRUCTIONS +
            "\n\n--- BEGIN STATEMENT TEXT ---\n\n" +
            extractedText +
            "\n\n--- END STATEMENT TEXT ---",
        },
      ],
    });
  } else {
    // image fallback (camera/photo). Send instructions then image.
    const base64data = Buffer.from(bytes).toString("base64");
    messages.push({
      role: "user",
      content: [
        { type: "text", text: INSTRUCTIONS },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64data}` },
        },
      ],
    });
  }

  const requestBody = {
    model: MODEL,
    messages,
    response_format: { type: "json_object" },
  };

  const json = await callOpenAI(requestBody);
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned no content");

  // Raw may be object already (because response_format), or a JSON string
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

  // Validate/parse with your zod schema
  return AiExtractSchema.parse(parsed);
}
