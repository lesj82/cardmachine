import Tesseract from 'tesseract.js';
import { extractText as unpdfExtractText, getDocumentProxy } from 'unpdf';

const money = (s: string) => {
  const m = s.replace(/[,£]/g, '').match(/(-?\d+(?:\.\d{1,2})?)/);
  return m ? parseFloat(m[1]) : 0; // Default to 0 instead of null
};

const isPDF = (b: Uint8Array) =>
  b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;

async function pdfTextFromBytes(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);          // load PDF[web:29]
  const { text } = await unpdfExtractText(pdf, {
    mergePages: true,                                 // single big string[web:29]
  });
  return text;
}

export async function extractGeneric(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = '';

  if (isPDF(bytes)) {
    // use unpdf instead of pdf-parse
    text = await pdfTextFromBytes(bytes);
  } else {
    const {
      data: { text: t },
    } = await Tesseract.recognize(Buffer.from(bytes), 'eng');
    text = t;
  }

  // --- START MODIFICATION ---

  let tx = 0;
  let monthTurnover = 0;

  // Strategy 1: Try to find the Dojo "Subtotal" line (page 4), as it has both values.
  // This regex matches: "Subtotal" ... "8169" ... "£190,828.37"
  const dojoSubtotalRegex = /Subtotal[^\d]+(\d{2,8})[^\d]+([£]?[\d,]+\.\d{2})/;
  const dojoMatch = text.match(dojoSubtotalRegex);

  if (dojoMatch && dojoMatch[1] && dojoMatch[2]) {
    tx = parseInt(dojoMatch[1].replace(/,/g, ''), 10) || 0;
    monthTurnover = money(dojoMatch[2]);
  }

  // Strategy 2: If Strategy 1 failed, try the original, more generic regexes.
  if (tx === 0) {
    for (const r of [
      /(transactions|tx\s*count)[^\d]{0,10}(\d{2,8})/i,
      /(Number\s+of\s+transactions)[\s",]+(\d{2,8})/i // From Dojo header
    ]) {
      const m = text.match(r);
      if (m && m[2]) {
        tx = parseInt(m[2].replace(/,/g, ''), 10);
        if (tx > 0) break;
      }
    }
  }

  if (monthTurnover === 0) {
    for (const r of [
      /(total\s+turnover|gross\s+sales|total\s+card\s+sales)[^£\d]{0,30}([£]?[\d,]+(?:\.\d{1,2})?)/i,
      /(processed\s+volume|total\s+volume)[^£\d]{0,30}([£]?[\d,]+(?:\.\d{1,2})?)/i,
    ]) {
      const m = text.match(r);
      if (m) {
        monthTurnover = money(m[2]);
        if (monthTurnover > 0) break;
      }
    }
  }

  // Fix for fixed fees: "card machine services" was the header,
  // "services for dojo go" is the line item.
  // Removing the header regex prevents double-counting.
  const labels = [
    'terminal',
    'pci',
    'security',
    'mmf',
    'minimum monthly',
    'monthly service',
    'gateway',
    'statement fee',
    'chargeback',
    'services for dojo go', // Specific line item from Dojo PDF
  ];
  // --- END MODIFICATION ---

  let fixed = 0;
  for (const lab of labels) {
    const m = new RegExp(
      `${lab}[^£\\n]{0,40}([£]?[\\d,]+(?:\\.\\d{1,2})?)`,
      'i'
    ).exec(text);
    if (m) fixed += money(m[1]); // Use money() which defaults to 0
  }

  // --- START MODIFICATION ---
  // Combine regexes for fees
  const totalFeesMatch = text.match(
    /(Net\s+amount)[^£\d]{0,20}([£]?[\d,]+(?:\.\d{1,2})?)/i // Dojo: "Net amount" on page 1
  ) || text.match(
    /(total\s+fees|fees\s+total|grand\s+total)[^£\d]{0,20}([£]?[\d,]+(?:\.\d{1,2})?)/i // Original
  );
  const currentFeesMonthly = totalFeesMatch ? money(totalFeesMatch[2]) : null;
  // --- END MODIFICATION ---

  const amex = text.match(
    /(amex|american express)[^£\d]{0,20}([£]?[\d,]+(?:\.\d{1,2})?)/i
  );
  const amexTurnover = amex ? money(amex[2]) : 0;
  const other = Math.max(0, monthTurnover - amexTurnover);

  const mix = {
    debitTurnover: other * 0.5,
    creditTurnover: other * 0.5,
    businessTurnover: 0,
    internationalTurnover: 0,
    amexTurnover,
    txCount: tx,
  };

  const present = [
    monthTurnover > 0,
    tx > 0,
    fixed > 0,
    currentFeesMonthly != null,
  ].filter(Boolean).length;

  const confidence = Math.min(1, present / 4);

  return {
    providerGuess: null,
    confidence,
    monthTurnover,
    mix,
    currentFeesMonthly,
    currentFixedMonthly: fixed,
  };
}