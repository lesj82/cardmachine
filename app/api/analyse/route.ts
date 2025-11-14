import { NextRequest, NextResponse } from 'next/server'
import { extractFromFile } from '@/lib/providers'
import { priceCMQ, computeSavings } from '@/lib/pricing'

export const runtime = 'nodejs'

export async function POST(req: NextRequest){
  const form = await req.formData()
  const file = form.get('file')
  const terminalOption = (form.get('terminalOption') as string) || 'none'
  const terminalsCount = Number(form.get('terminalsCount') || 1)
  if(!(file instanceof Blob)) return NextResponse.json({error:'Missing file'},{status:400})

  const fields:any = await extractFromFile(file as Blob)

  // --- START MODIFICATION ---
  // Add logging and validation as per CMQ_Debug_Instructions.pdf [cite: 217, 245, 246]

  const { monthTurnover, currentFeesMonthly, mix } = fields;
  const txCount = mix?.txCount;

  // Specific logging requested in debug instructions [cite: 227]
  console.log("AI extracted fields:", fields); 

  // Specific parsed values logging [cite: 228]
  console.log("Parsed values:", { 
    monthTurnover: monthTurnover, // [cite: 229]
    currentFees: currentFeesMonthly, // [cite: 230]
    txCount: txCount // [cite: 231]
  });

  // Fallback logic/validation 
  if (!monthTurnover || monthTurnover < 1) {
    return NextResponse.json({ error: 'Could not extract valid Turnover from statement.' }, { status: 400 });
  }
  if (!txCount || txCount < 1) {
    return NextResponse.json({ error: 'Could not extract valid Transaction Count from statement.' }, { status: 400 });
  }
  // --- END MODIFICATION ---


  const pricingInput = { monthTurnover:fields.monthTurnover, mix:fields.mix, currentFeesMonthly:fields.currentFeesMonthly, currentFixedMonthly:fields.currentFixedMonthly, terminalOption:terminalOption as any, terminalsCount }
  const { cmqMonthly, oneOff } = priceCMQ(pricingInput)
  const { monthlySaving, annualSaving } = computeSavings(pricingInput)
  return NextResponse.json({ providerGuess:fields.providerGuess, confidence:fields.confidence, fields, quote:{ tierName:'auto', cmqMonthly, oneOff, monthlySaving, annualSaving } })
}