// app/api/analyse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { priceCMQ, computeSavings, pickTier } from "@/lib/pricing";
import { RATES } from "@/config/rates";
import { extractFromFile } from "@/lib/providers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const terminalOption = (form.get("terminalOption") as string) || "none";
  const terminalsCount = Number(form.get("terminalsCount") || 1);

  if (!(file instanceof Blob)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const fields: any = await extractFromFile(file as Blob);

  const { monthTurnover, currentFeesMonthly, mix } = fields;
  const txCount = mix?.txCount;

  console.log("AI extracted fields:", fields);
  console.log("Parsed values:", { monthTurnover, currentFeesMonthly, txCount });

  if (!monthTurnover || monthTurnover < 1) {
    return NextResponse.json({ error: "Could not extract valid Turnover from statement." }, { status: 400 });
  }
  if (!txCount || txCount < 1) {
    return NextResponse.json({ error: "Could not extract valid Transaction Count from statement." }, { status: 400 });
  }

  const pricingInput = { monthTurnover: fields.monthTurnover, mix: fields.mix, currentFeesMonthly: fields.currentFeesMonthly, currentFixedMonthly: fields.currentFixedMonthly, terminalOption: terminalOption as any, terminalsCount };

  const tier = pickTier(RATES, pricingInput.monthTurnover);
  console.log("selected tier:", tier.name);

  const { cmqMonthly, oneOff } = priceCMQ(pricingInput);
  const { monthlySaving, annualSaving } = computeSavings(pricingInput);

  // You can format the response as you like
  return NextResponse.json({
    providerGuess: fields.providerGuess,
    confidence: fields.confidence,
    fields,
    quote: {
      tierName: "auto",
      currentMonthly: pricingInput.currentFeesMonthly,
      cmqMonthly,
      oneOff,
      monthlySaving,
      annualSaving,
      pricingTier: tier.name,
      qualifiedRates: tier.rates,
    },
  });
}
