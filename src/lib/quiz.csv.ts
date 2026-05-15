// Tiny CSV utilities (browser + server safe). RFC 4180-ish, no streaming.

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { cur.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export const QUESTION_CSV_HEADERS = [
  "type",
  "text_en",
  "text_bn",
  "options_en",
  "options_bn",
  "correct",
  "correct_order",
  "explanation_en",
  "explanation_bn",
  "hint_en",
  "hint_bn",
  "points",
  "image_url",
] as const;

export const QUESTION_CSV_TEMPLATE =
  toCSV([
    QUESTION_CSV_HEADERS as unknown as string[],
    ["single", "Capital of France?", "ফ্রান্সের রাজধানী?", "Paris|London|Berlin|Rome", "প্যারিস|লন্ডন|বার্লিন|রোম", "0", "", "Paris is the capital.", "প্যারিস ফ্রান্সের রাজধানী।", "", "", "10", ""],
    ["true_false", "Earth is round.", "পৃথিবী গোল।", "True|False", "সত্য|মিথ্যা", "0", "", "", "", "", "", "10", ""],
    ["fill_blank", "5 pillars of __", "ইসলামের ৫ ভিত্তি ___", "", "", "Islam|islam", "", "", "", "", "", "10", ""],
    ["ordering", "Sort prayers by time", "সময় অনুযায়ী সাজান", "Fajr|Dhuhr|Asr|Maghrib", "ফজর|যোহর|আসর|মাগরিব", "", "0|1|2|3", "", "", "", "", "10", ""],
  ]);
