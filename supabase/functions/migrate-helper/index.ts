import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (_req) => {
  return new Response(
    JSON.stringify({ message: "migrate-helper ready" }),
    { headers: { "Content-Type": "application/json" } },
  )
})
