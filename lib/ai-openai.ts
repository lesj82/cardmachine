import { AiExtractSchema, AiExtract } from './ai'

export async function openaiExtractFromFile(file: Blob): Promise<AiExtract> {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')
  
  const bytes = Buffer.from(await file.arrayBuffer())
  const base64data = bytes.toString('base64');
  const mimeType = file.type || 'application/pdf'; // Get MIME type from file

  const system = `You extract structured finance data from UK merchant services statements. Return ONLY valid JSON.`
  const user = `Extract the following fields from the merchant statement. You MUST find the grand total for each.
- Total turnover (total value of all transactions)
- Total transaction count
- Total amount charged in fees by the provider (this is the total 'Net amount' or 'Total due' before VAT)
- providerGuess
- sum of fixed monthly fees
- card mix (debit, credit, business, international, amex turnovers and total txCount)
Return ONLY valid JSON.`

  // --- START MODIFICATION ---

  // 1. Use the standard Chat Completions endpoint
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      
      // 2. Use the standard 'messages' array structure
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          // 3. Use the standard 'content' array for multimodal input
          content: [
            { type: 'text', text: user },
            {
              // 4. Use 'image_url' and format as a data URL
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64data}`
              }
            }
          ]
        }
      ],
      
      // 5. Use the standard 'json_object' response format
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(parseInt(process.env.AI_TIMEOUT_MS || '240000'))
  })

  // Add enhanced error logging
  if (!res.ok) {
    const errorBody = await res.text();
    console.error("OpenAI API Error Body:", errorBody); // Log the full error
    throw new Error(`OpenAI error ${res.status}`)
  }

  const body = await res.json()

  // 6. Parse the standard response structure
  const text = body.choices[0].message.content;
  const raw = text; 
  // --- END MODIFICATION ---

  return AiExtractSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw)
}