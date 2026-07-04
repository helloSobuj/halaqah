import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ModeSchema = z.enum(["online", "offline", "hybrid"]);
const ChannelSchema = z.enum([
  "link",
  "image",
  "whatsapp",
  "facebook",
  "x",
  "telegram",
  "native",
  "qr_scan",
]);

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("admin") && !roles.includes("moderator")) {
    throw new Error("Forbidden");
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ------------------- Public reads -------------------

export const listEventCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("event_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listEvents = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        filter: z.enum(["upcoming", "past", "featured", "all"]).default("upcoming"),
        categorySlug: z.string().max(60).optional(),
        q: z.string().max(120).optional(),
        limit: z.number().min(1).max(50).default(24),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin
        .from("event_categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      categoryId = c?.id ?? null;
    }

    let query = supabaseAdmin
      .from("events")
      .select("*")
      .eq("is_published", true)
      .limit(data.limit);

    const nowIso = new Date().toISOString();
    if (data.filter === "upcoming") {
      query = query
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true });
    } else if (data.filter === "past") {
      query = query
        .lt("starts_at", nowIso)
        .order("starts_at", { ascending: false });
    } else if (data.filter === "featured") {
      query = query.eq("is_featured", true).order("starts_at", { ascending: true });
    } else {
      query = query.order("starts_at", { ascending: false });
    }

    if (categoryId) query = query.eq("category_id", categoryId);
    if (data.q && data.q.trim().length > 1) {
      const term = `%${data.q.trim()}%`;
      query = query.or(`title_en.ilike.${term},title_bn.ilike.${term}`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    const catIds = Array.from(new Set(list.map((r) => r.category_id).filter(Boolean) as string[]));
    const evIds = list.map((r) => r.id);

    const [{ data: cats }, { data: rsvps }] = await Promise.all([
      catIds.length
        ? supabaseAdmin.from("event_categories").select("id,slug,name_en,name_bn,color,icon").in("id", catIds)
        : Promise.resolve({ data: [] as Array<{ id: string; slug: string; name_en: string; name_bn: string; color: string | null; icon: string | null }> }),
      evIds.length
        ? supabaseAdmin.from("event_rsvps").select("event_id,status,guest_count").in("event_id", evIds)
        : Promise.resolve({ data: [] as Array<{ event_id: string; status: string; guest_count: number }> }),
    ]);

    const catMap = new Map((cats ?? []).map((c) => [c.id, c]));
    const rsvpMap = new Map<string, { going: number; interested: number }>();
    for (const r of rsvps ?? []) {
      const cur = rsvpMap.get(r.event_id) ?? { going: 0, interested: 0 };
      if (r.status === "going") cur.going += 1 + (r.guest_count ?? 0);
      else if (r.status === "interested") cur.interested += 1;
      rsvpMap.set(r.event_id, cur);
    }

    return list.map((e) => ({
      ...e,
      category: e.category_id ? catMap.get(e.category_id) ?? null : null,
      counts: rsvpMap.get(e.id) ?? { going: 0, interested: 0 },
    }));
  });

export const getEventBySlug = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data }) => {
    const { data: e, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!e) throw new Error("Event not found");

    await supabaseAdmin.rpc("bump_event_view", { _event_id: e.id });

    const [{ data: cat }, { data: rsvps }] = await Promise.all([
      e.category_id
        ? supabaseAdmin
            .from("event_categories")
            .select("id,slug,name_en,name_bn,color,icon")
            .eq("id", e.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null as null | { id: string; slug: string; name_en: string; name_bn: string; color: string | null; icon: string | null } }),
      supabaseAdmin.from("event_rsvps").select("status").eq("event_id", e.id),
    ]);

    const counts = { going: 0, interested: 0 };
    for (const r of rsvps ?? []) {
      if (r.status === "going") counts.going += 1;
      else if (r.status === "interested") counts.interested += 1;
    }

    return { event: e, category: cat ?? null, counts };
  });

export const getMyRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: r } = await supabaseAdmin
      .from("event_rsvps")
      .select("status")
      .eq("event_id", data.eventId)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { status: (r?.status as "going" | "interested" | "cancelled" | undefined) ?? null };
  });

export const setMyRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        eventId: z.string().uuid(),
        status: z.enum(["going", "interested", "cancelled"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("event_rsvps")
      .upsert(
        { event_id: data.eventId, user_id: context.userId, status: data.status },
        { onConflict: "event_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordShare = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ eventId: z.string().uuid(), channel: ChannelSchema }).parse(i),
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.from("event_shares").insert({
      event_id: data.eventId,
      channel: data.channel,
    });
    await supabaseAdmin.rpc("bump_event_view", { _event_id: data.eventId });
    // best-effort: also bump share_count
    await supabaseAdmin
      .from("events")
      .update({ share_count: (await supabaseAdmin.from("events").select("share_count").eq("id", data.eventId).maybeSingle()).data?.share_count ?? 0 })
      .eq("id", data.eventId);
    return { ok: true };
  });

// ------------------- Admin writes -------------------

const EventInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().max(80).optional(),
  category_id: z.string().uuid().nullable().optional(),
  title_en: z.string().min(2).max(200),
  title_bn: z.string().min(1).max(200),
  description_md_en: z.string().max(20000).default(""),
  description_md_bn: z.string().max(20000).default(""),
  cover_image_url: z.string().url().nullable().optional(),
  starts_at: z.string().min(1),
  ends_at: z.string().nullable().optional(),
  timezone: z.string().min(1).max(60).default("UTC"),
  mode: ModeSchema.default("offline"),
  venue: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  online_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  capacity: z.number().int().min(0).nullable().optional(),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
});

export const adminUpsertEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => EventInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let slug = (data.slug && data.slug.length > 0 ? data.slug : slugify(data.title_en)) || slugify(data.title_en);
    if (!slug) slug = `event-${Date.now().toString(36)}`;

    const payload = {
      slug,
      category_id: data.category_id ?? null,
      title_en: data.title_en,
      title_bn: data.title_bn,
      description_md_en: data.description_md_en ?? "",
      description_md_bn: data.description_md_bn ?? "",
      cover_image_url: data.cover_image_url ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at ?? null,
      timezone: data.timezone,
      mode: data.mode,
      venue: data.venue ?? null,
      address: data.address ?? null,
      online_url: data.online_url ?? null,
      capacity: data.capacity ?? null,
      is_published: data.is_published,
      is_featured: data.is_featured,
      created_by: context.userId,
    };

    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("events")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAllEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const list = data ?? [];
    const ids = list.map((e) => e.id);
    const counts = new Map<string, { going: number; interested: number }>();
    if (ids.length) {
      const { data: rs } = await supabaseAdmin
        .from("event_rsvps")
        .select("event_id,status")
        .in("event_id", ids);
      for (const r of rs ?? []) {
        const c = counts.get(r.event_id) ?? { going: 0, interested: 0 };
        if (r.status === "going") c.going += 1;
        else if (r.status === "interested") c.interested += 1;
        counts.set(r.event_id, c);
      }
    }
    return list.map((e) => ({
      ...e,
      counts: counts.get(e.id) ?? { going: 0, interested: 0 },
    }));
  });

export const adminListEventRsvps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: rsvps, error } = await supabaseAdmin
      .from("event_rsvps")
      .select("user_id,status,created_at")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rsvps ?? [];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const profiles = userIds.length
      ? (await supabaseAdmin
          .from("profiles")
          .select("id,display_name,avatar_url")
          .in("id", userIds)).data ?? []
      : [];
    const pMap = new Map(profiles.map((p) => [p.id, p]));
    return list.map((r) => ({
      ...r,
      profile: pMap.get(r.user_id) ?? null,
    }));
  });

// ------------------- Host registration -------------------

export const registerAsHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        eventId: z.string().uuid(),
        hostName: z.string().trim().min(2).max(120),
        hostAddress: z.string().trim().min(2).max(500),
        hostCapacity: z.number().int().min(1).max(100000),
        agreed: z.literal(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("id,host_user_id,allow_host_registration,is_published")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Event not found");
    if (!ev.is_published) throw new Error("Event not available");
    if (ev.allow_host_registration === false) {
      throw new Error("Host registration is closed for this event");
    }
    if (ev.host_user_id) throw new Error("This event already has a host");

    const { error } = await supabaseAdmin
      .from("events")
      .update({
        host_user_id: context.userId,
        host_name: data.hostName,
        host_address: data.hostAddress,
        host_capacity: data.hostCapacity,
        host_registered_at: new Date().toISOString(),
        venue: data.hostName,
        address: data.hostAddress,
        capacity: data.hostCapacity,
      })
      .eq("id", data.eventId)
      .is("host_user_id", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        eventId: z.string().uuid(),
        hostName: z.string().trim().min(2).max(120),
        hostAddress: z.string().trim().min(2).max(500),
        hostCapacity: z.number().int().min(1).max(100000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("events")
      .update({
        host_name: data.hostName,
        host_address: data.hostAddress,
        host_capacity: data.hostCapacity,
        venue: data.hostName,
        address: data.hostAddress,
        capacity: data.hostCapacity,
      })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminClearHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("events")
      .update({
        host_user_id: null,
        host_name: null,
        host_address: null,
        host_capacity: null,
        host_registered_at: null,
        venue: null,
        address: null,
      })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------- Speaker / Participant booking -------------------

const SpeakerInput = z.object({
  name: z.string().trim().min(2).max(120),
  topic: z.string().trim().min(2).max(300),
  startMinute: z.number().int().min(0).max(10000),
  durationMinutes: z.number().int().min(5).max(45),
  isForChild: z.boolean().default(false),
  childName: z.string().trim().max(120).nullable().optional(),
});

function validateSlot(start: number, duration: number) {
  if (start % 5 !== 0) throw new Error("Start must align to 5-minute slots");
  if (duration % 5 !== 0) throw new Error("Duration must be in 5-minute increments");
  if (duration < 5 || duration > 45) throw new Error("Duration must be between 5 and 45 minutes");
}

async function assertNoOverlap(
  eventId: string,
  start: number,
  duration: number,
  excludeId?: string,
) {
  const end = start + duration;
  let q = supabaseAdmin
    .from("event_speakers")
    .select("id,start_minute,duration_minutes")
    .eq("event_id", eventId);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const rStart = row.start_minute;
    const rEnd = row.start_minute + row.duration_minutes;
    if (start < rEnd && end > rStart) {
      throw new Error("This time slot is already booked");
    }
  }
}

export const listEventSpeakers = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("event_speakers")
      .select("*")
      .eq("event_id", data.eventId)
      .order("start_minute", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const registerAsSpeaker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    SpeakerInput.extend({ eventId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    validateSlot(data.startMinute, data.durationMinutes);
    if (data.isForChild && (!data.childName || data.childName.trim().length < 2)) {
      throw new Error("Child name is required");
    }
    await assertNoOverlap(data.eventId, data.startMinute, data.durationMinutes);
    const { data: row, error } = await supabaseAdmin
      .from("event_speakers")
      .insert({
        event_id: data.eventId,
        user_id: context.userId,
        name: data.name,
        topic: data.topic,
        start_minute: data.startMinute,
        duration_minutes: data.durationMinutes,
        is_for_child: data.isForChild,
        child_name: data.isForChild ? data.childName : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMySpeakerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    SpeakerInput.extend({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    validateSlot(data.startMinute, data.durationMinutes);
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("event_speakers")
      .select("event_id,user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Entry not found");
    if (existing.user_id !== context.userId) throw new Error("Forbidden");
    await assertNoOverlap(existing.event_id, data.startMinute, data.durationMinutes, data.id);
    const { error } = await supabaseAdmin
      .from("event_speakers")
      .update({
        name: data.name,
        topic: data.topic,
        start_minute: data.startMinute,
        duration_minutes: data.durationMinutes,
        is_for_child: data.isForChild,
        child_name: data.isForChild ? data.childName : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMySpeakerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await supabaseAdmin
      .from("event_speakers")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Entry not found");
    if (existing.user_id !== context.userId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("event_speakers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMySpeakerEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("event_speakers")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const evIds = Array.from(new Set((rows ?? []).map((r) => r.event_id)));
    const { data: evs } = evIds.length
      ? await supabaseAdmin
          .from("events")
          .select("id,slug,title_en,title_bn,starts_at")
          .in("id", evIds)
      : { data: [] as Array<{ id: string; slug: string; title_en: string; title_bn: string; starts_at: string }> };
    const evMap = new Map((evs ?? []).map((e) => [e.id, e]));
    return (rows ?? []).map((r) => ({ ...r, event: evMap.get(r.event_id) ?? null }));
  });

export const adminUpsertSpeaker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    SpeakerInput.extend({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    validateSlot(data.startMinute, data.durationMinutes);
    await assertNoOverlap(data.eventId, data.startMinute, data.durationMinutes, data.id);
    const payload = {
      event_id: data.eventId,
      name: data.name,
      topic: data.topic,
      start_minute: data.startMinute,
      duration_minutes: data.durationMinutes,
      is_for_child: data.isForChild,
      child_name: data.isForChild ? data.childName : null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("event_speakers")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabaseAdmin
      .from("event_speakers")
      .insert({ ...payload, user_id: null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSpeaker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("event_speakers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------- Contributors -------------------

const ContributorInput = z.object({
  contributorName: z.string().trim().min(2).max(120),
  contribution: z.string().trim().min(2).max(300),
  details: z.string().trim().max(2000).optional().default(""),
});

async function assertCanViewContribs(eventId: string, userId: string) {
  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("host_user_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) throw new Error("Event not found");
  if (ev.host_user_id === userId) return;
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const r = (roles ?? []).map((x) => x.role as string);
  if (r.includes("admin") || r.includes("moderator")) return;
  throw new Error("Forbidden");
}

export const registerAsContributor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ContributorInput.extend({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("event_contributors")
      .insert({
        event_id: data.eventId,
        user_id: context.userId,
        contributor_name: data.contributorName,
        contribution: data.contribution,
        details: data.details || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMyContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ContributorInput.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await supabaseAdmin
      .from("event_contributors")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Not found");
    if (existing.user_id !== context.userId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("event_contributors")
      .update({
        contributor_name: data.contributorName,
        contribution: data.contribution,
        details: data.details || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await supabaseAdmin
      .from("event_contributors")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Not found");
    if (existing.user_id !== context.userId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("event_contributors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEventContributions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertCanViewContribs(data.eventId, context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("event_contributors")
      .select("*")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const canViewContributions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    try {
      await assertCanViewContribs(data.eventId, context.userId);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  });

export const getMyContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await supabaseAdmin
      .from("event_contributors")
      .select("*")
      .eq("event_id", data.eventId)
      .eq("user_id", context.userId);
    return rows ?? [];
  });

export const adminUpdateContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ContributorInput.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("event_contributors")
      .update({
        contributor_name: data.contributorName,
        contribution: data.contribution,
        details: data.details || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("event_contributors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



