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

export type CsvQuestionRow = {
  type: "single" | "multi" | "true_false" | "fill_blank" | "ordering";
  text_en: string;
  text_bn: string;
  options_en: string[];
  options_bn: string[];
  correct_indices: number[];
  correct_text: string[];
  correct_order: number[];
  explanation_en: string | null;
  explanation_bn: string | null;
  hint_en: string | null;
  hint_bn: string | null;
  points: number;
  image_url: string | null;
};

const splitPipe = (s: string) =>
  s.split("|").map((x) => x.trim()).filter((x) => x.length > 0);

const intList = (s: string): number[] =>
  splitPipe(s).map((x) => Number.parseInt(x, 10)).filter((n) => Number.isFinite(n));

const orNull = (s: string) => (s.trim().length === 0 ? null : s.trim());

export function parseQuestionsCSV(text: string): CsvQuestionRow[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const required = ["type", "text_en", "text_bn"];
  for (const r of required) {
    if (col(r) === -1) throw new Error(`CSV is missing required column: ${r}`);
  }
  const out: CsvQuestionRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (n: string) => (col(n) === -1 ? "" : (r[col(n)] ?? "").toString());
    const type = get("type").trim().toLowerCase() as CsvQuestionRow["type"];
    if (!["single", "multi", "true_false", "fill_blank", "ordering"].includes(type)) {
      throw new Error(`Row ${i + 1}: invalid type "${type}"`);
    }
    const points = Number.parseInt(get("points"), 10);
    out.push({
      type,
      text_en: get("text_en"),
      text_bn: get("text_bn"),
      options_en: splitPipe(get("options_en")),
      options_bn: splitPipe(get("options_bn")),
      correct_indices: intList(get("correct")),
      correct_text: type === "fill_blank" ? splitPipe(get("correct")) : [],
      correct_order: intList(get("correct_order")),
      explanation_en: orNull(get("explanation_en")),
      explanation_bn: orNull(get("explanation_bn")),
      hint_en: orNull(get("hint_en")),
      hint_bn: orNull(get("hint_bn")),
      points: Number.isFinite(points) && points > 0 ? points : 10,
      image_url: orNull(get("image_url")),
    });
  }
  return out;
}

export function questionsToCSV(
  rows: Array<{
    type: string;
    text_en: string;
    text_bn: string;
    options_en: string[];
    options_bn: string[];
    correct_indices: number[];
    correct_text: string[];
    correct_order: number[];
    explanation_en: string | null;
    explanation_bn: string | null;
    hint_en: string | null;
    hint_bn: string | null;
    points: number;
    image_url: string | null;
  }>,
): string {
  const body = rows.map((r) => [
    r.type,
    r.text_en,
    r.text_bn,
    r.options_en.join("|"),
    r.options_bn.join("|"),
    r.type === "fill_blank" ? r.correct_text.join("|") : r.correct_indices.join("|"),
    r.correct_order.join("|"),
    r.explanation_en ?? "",
    r.explanation_bn ?? "",
    r.hint_en ?? "",
    r.hint_bn ?? "",
    r.points,
    r.image_url ?? "",
  ]);
  return toCSV([QUESTION_CSV_HEADERS as unknown as string[], ...body]);
}

