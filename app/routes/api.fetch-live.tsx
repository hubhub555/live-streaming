export const loader = async ({ request, context }) => {
  const API_KEY = context.cloudflare.env.YOUTUBE_API_KEY;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "ゲーム 配信 ライブ";
  const maxResults = Number(url.searchParams.get("max") ?? 10);

  // ================================
  // 1) ライブ検索（Search API）
  // ================================
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("eventType", "live");
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("key", API_KEY);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    return Response.json(
      { error: "Failed to fetch YouTube search API" },
      { status: 500 }
    );
  }

  const searchJson = await searchRes.json();
  const items = searchJson.items ?? [];

  const videoIds = items
    .map((item) => item.id?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) {
    return Response.json({ data: [] });
  }

  // ================================
  // 2) 動画詳細取得（Videos API）
  // ================================
  const detailUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailUrl.searchParams.set("part", "snippet,statistics");
  detailUrl.searchParams.set("id", videoIds.join(","));
  detailUrl.searchParams.set("key", API_KEY);

  const videosRes = await fetch(detailUrl);
  if (!videosRes.ok) {
    return Response.json(
      { error: "Failed to fetch YouTube videos API" },
      { status: 500 }
    );
  }

  const videosJson = await videosRes.json();
  const videoItems = videosJson.items ?? [];

  const result = videoItems.map((video) => ({
    videoId: video.id,
    title: video.snippet?.title ?? "",
    thumbnailUrl:
      video.snippet?.thumbnails?.high?.url ??
      video.snippet?.thumbnails?.medium?.url ??
      video.snippet?.thumbnails?.default?.url ??
      "",
    viewCount: video.statistics?.viewCount ?? "0",
    platform: "youtube",
  }));

  // ================================
  // 3) KV に保存
  // ================================
  await context.cloudflare.env.LIVE.put(
    "live-json",
    JSON.stringify({ live: result })
  );

  // ================================
  // 4) レスポンス返却
  // ================================
  return Response.json({ data: result });
};
