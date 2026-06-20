import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AyatRow = {
  date: string;
  arabic: string;
  bn: string;
  en: string;
  surah_number: number;
  ayat_number: number;
  surah_name_en: string;
  surah_name_bn: string;
};

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function generateAyatViaAI(dateStr: string): Promise<Omit<AyatRow, "date">> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const prompt = `Pick ONE short, well-known ayah (verse) from the Holy Quran suitable for daily reflection. Use seed date ${dateStr} to pick a different ayah each day.
Return STRICT JSON only, no markdown, with keys: arabic (Arabic text of the ayah with diacritics), bn (Bengali translation), en (clear English translation), surah_number (integer 1-114), ayat_number (integer), surah_name_en (e.g. "Al-Baqarah"), surah_name_bn (Bengali surah name, e.g. "আল-বাকারা"). Keep texts under 400 chars.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI returned non-JSON content");
    parsed = JSON.parse(m[0]);
  }
  return {
    arabic: String(parsed.arabic ?? "").slice(0, 800),
    bn: String(parsed.bn ?? "").slice(0, 800),
    en: String(parsed.en ?? "").slice(0, 800),
    surah_number: Number(parsed.surah_number) || 1,
    ayat_number: Number(parsed.ayat_number) || 1,
    surah_name_en: String(parsed.surah_name_en ?? "").slice(0, 100),
    surah_name_bn: String(parsed.surah_name_bn ?? "").slice(0, 100),
  };
}

export const getDailyAyat = createServerFn({ method: "GET" }).handler(async () => {
  const date = todayUtcDate();
  const { data: cached } = await supabaseAdmin
    .from("daily_ayat" as any)
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (cached) return cached as unknown as AyatRow;
  try {
    const generated = await generateAyatViaAI(date);
    const row: AyatRow = { date, ...generated };
    const { data: inserted, error } = await supabaseAdmin
      .from("daily_ayat" as any)
      .upsert(row, { onConflict: "date" })
      .select()
      .single();
    if (error) throw error;
    return inserted as unknown as AyatRow;
  } catch (err) {
    const { data: latest } = await supabaseAdmin
      .from("daily_ayat" as any)
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) return latest as unknown as AyatRow;
    throw err instanceof Error ? err : new Error("Failed to load ayat");
  }
});
