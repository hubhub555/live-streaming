import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
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
    console.log(API_KEY)
    console.log(searchRes.statusText)

    const errorText = await searchRes.text(); // ★ここ重要
    console.error("YouTube API Error:", errorText);

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
  const youtubeDetailUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  youtubeDetailUrl.searchParams.set("part", "snippet,statistics");
  youtubeDetailUrl.searchParams.set("id", videoIds.join(","));
  youtubeDetailUrl.searchParams.set("key", API_KEY);

  const videosRes = await fetch(youtubeDetailUrl);
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

  const CLIENT_ID = "";
  const CLIENT_SECRET = "";

  const token = await getTwitchToken(CLIENT_ID, CLIENT_SECRET);
  const twitchLives = await fetchTopGames(token, CLIENT_ID, 10)

  return Response.json({ data: twitchLives });


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

async function getTwitchToken(TWITCH_CLIENT_ID: string, TWITCH_CLIENT_SECRET: string) {
  const url = `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`;

  const res = await fetch(url, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`tokenの取得に失敗しました: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token; // Bearer token
}


async function fetchTopGames(token: string, TWITCH_CLIENT_ID: string, limit = 10) {
  const url = `https://api.twitch.tv/helix/games/top?first=${limit}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Twitchの動画取得に失敗しました:", err);
    throw new Error(`Twitch API failed: ${res.status}`);
  }

  const data = await res.json();
  return data.data; // ゲームリスト
}

