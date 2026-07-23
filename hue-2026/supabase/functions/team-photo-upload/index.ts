// Retired after the trip-api cutover. Keeping a harmless handler prevents an
// old deployed function from accepting browser-supplied session tokens.
Deno.serve(() => new Response(JSON.stringify({ error: "Endpoint đã được thay thế." }), {
  status: 410,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  }
}));
