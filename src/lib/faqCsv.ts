/**
 * CSV importer for Marketing Business Brain FAQs.
 * It parses quoted commas, CRLF, multi-line answers, doubled quotes and UTF-8 BOM.
 * Imported FAQs are staged locally; the user must explicitly save the Brain.
 */
export interface ImportedFaq {
  q: string;
  a: string;
}
export const FAQ_CSV_MAX_BYTES = 1024 * 1024;
export const FAQ_MAX_STORED = 100;
export const FAQ_MAX_QUESTION = 1000;
export const FAQ_MAX_ANSWER = 2000;

export function parseFaqCsv(source: string): ImportedFaq[] {
  if (new TextEncoder().encode(source).byteLength > FAQ_CSV_MAX_BYTES) {
    throw new Error('CSV must be 1 MB or smaller.');
  }
  const csv = source.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let fields: string[] = [];
  let value = '';
  let quoted = false;
  let justClosed = false;
  let atStart = true;

  function field() {
    fields.push(value.trim());
    value = '';
    justClosed = false;
    atStart = true;
  }
  function record() {
    field();
    if (fields.some(v => v !== '')) records.push(fields);
    if (records.length > 2001) throw new Error('CSV contains too many rows.');
    fields = [];
  }
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"') {
        if (csv[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; justClosed = true; }
      } else {
        value += char;
      }
    } else if (char === ',' || char === '\r' || char === '\n') {
      if (char === '\r' && csv[i + 1] === '\n') i++;
      if (char === ',') field(); else record();
    } else if (char === '"' && atStart) {
      quoted = true;
      atStart = false;
    } else if (justClosed && (char === ' ' || char === '\t')) {
      continue;
    } else if (justClosed || char === '"') {
      throw new Error('CSV has a malformed quoted cell near row ' + (records.length + 1) + '.');
    } else {
      value += char;
      atStart = false;
    }
  }
  if (quoted) throw new Error('CSV contains an unfinished quoted cell.');
  if (value || fields.length || justClosed) record();
  if (!records.length) throw new Error('CSV is empty.');

  const header = records[0].map(v => v.toLowerCase().replace(/\s+/g, ' ').trim());
  const questionIndex = header.findIndex(v => ['question', 'q', 'faq question'].includes(v));
  const answerIndex = header.findIndex(v => ['answer', 'a', 'faq answer'].includes(v));
  if (questionIndex < 0 || answerIndex < 0 || questionIndex === answerIndex) {
    throw new Error('CSV needs Question and Answer columns (or Q and A).');
  }
  const result: ImportedFaq[] = [];
  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const q = (row[questionIndex] || '').trim();
    const a = (row[answerIndex] || '').trim();
    if (!q && !a) continue;
    if (!q || !a) throw new Error('Missing question or answer on CSV row ' + (i + 1) + '.');
    if (q.length > FAQ_MAX_QUESTION) throw new Error('Question exceeds 1,000 characters on row ' + (i + 1) + '.');
    if (a.length > FAQ_MAX_ANSWER) throw new Error('Answer exceeds 2,000 characters on row ' + (i + 1) + '.');
    result.push({q, a});
    if (result.length > 1000) throw new Error('Import supports up to 1,000 input FAQs. Split larger files.');
  }
  if (!result.length) throw new Error('CSV contains no question-and-answer pairs.');
  return result;
}

export function mergeFaqs(existing: ImportedFaq[], imported: ImportedFaq[]) {
  const merged = [...existing];
  const keys = new Set(existing.map(item => item.q.trim().toLocaleLowerCase()));
  let skipped = 0;
  for (const faq of imported) {
    const key = faq.q.trim().toLocaleLowerCase();
    if (keys.has(key)) { skipped++; continue; }
    if (merged.length >= FAQ_MAX_STORED) {
      throw new Error('The Business Brain allows a maximum of 100 FAQs. Remove old FAQs before importing more.');
    }
    merged.push(faq);
    keys.add(key);
  }
  return {faqs: merged, added: merged.length - existing.length, skipped};
}
