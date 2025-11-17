export const loader = async ({ context }) => {
  // KV から取得
  const raw = await context.cloudflare.env.LIVE.get("live-json");

  if (!raw) {
    return Response.json(
      { live: [], error: "No data in KV" },
      { status: 200 }
    );
  }

  try {
    const data = JSON.parse(raw);

    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    return Response.json(
      { live: [], error: "Invalid JSON in KV" },
      { status: 500 }
    );
  }
};
