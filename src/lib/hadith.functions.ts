import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type HadithRow = {
  date: string;
  arabic: string;
  en: string;
  bn: string;
  source: string;
};

function todayUtcDate(): string {
  // YYYY-MM-DD in UTC — keeps everyone on the same cached row regardless of TZ
  return new Date().toISOString().slice(0, 10);
}

async function generateHadithViaAI(dateStr: string): Promise<Omit<HadithRow, "date">> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const prompt = `You are an authentic Islamic scholar. Return ONE short, authentic, well-known hadith from Sahih Bukhari, Sahih Muslim, Riyad as-Salihin, or 40 Hadith Nawawi suitable for daily reflection. Use seed date ${dateStr} to pick a different hadith each day.
Return STRICT JSON only, no markdown, with keys: arabic (Arabic text with diacritics), en (clear English translation), bn (Bengali translation), source (collection name and number, e.g. "Sahih Bukhari 6018"). Keep each text under 400 chars.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
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
    // Try to recover JSON between braces
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI returned non-JSON content");
    parsed = JSON.parse(m[0]);
  }
  return {
    arabic: String(parsed.arabic ?? "").slice(0, 800),
    en: String(parsed.en ?? "").slice(0, 800),
    bn: String(parsed.bn ?? "").slice(0, 800),
    source: String(parsed.source ?? "").slice(0, 200),
  };
}

export const getDailyHadith = createServerFn({ method: "GET" }).handler(async () => {
  const date = todayUtcDate();

  // 1. Try cache
  const { data: cached } = await supabaseAdmin
    .from("daily_hadith")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (cached) return cached as HadithRow;

  // 2. Generate via AI and persist
  try {
    const generated = await generateHadithViaAI(date);
    const row: HadithRow = { date, ...generated };
    // Upsert — race-safe across concurrent first-of-day visitors
    const { data: inserted, error } = await supabaseAdmin
      .from("daily_hadith")
      .upsert(row, { onConflict: "date" })
      .select()
      .single();
    if (error) throw error;
    return inserted as HadithRow;
  } catch (err) {
    // 3. Fallback to most recent cached hadith if AI fails (e.g. rate limit)
    const { data: latest } = await supabaseAdmin
      .from("daily_hadith")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) return latest as HadithRow;
    throw err instanceof Error ? err : new Error("Failed to load hadith");
  }
});
