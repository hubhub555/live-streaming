export const loader = async ({ request, context }) => {
  // Cloudflare 上では context.cloudflare.env を使う。ローカル開発では process.env をフォールバック
  const API_KEY =
    (context?.cloudflare?.env?.YOUTUBE_API_KEY as string) ||
    process.env.YOUTUBE_API_KEY ||
    "";

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
    // YouTube が空でも Twitch のデータは取得してみる（下流で統合）
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

  const youtubeItems = videoItems.map((video) => {
    const vid = video.id;
    const viewCount = Number(video.statistics?.viewCount ?? 0);
    return {
      id: `youtube_${vid}`,
      platform: "youtube",
      title: video.snippet?.title ?? "",
      thumbnailUrl:
        video.snippet?.thumbnails?.high?.url ??
        video.snippet?.thumbnails?.medium?.url ??
        video.snippet?.thumbnails?.default?.url ??
        "",
      viewers: viewCount,
      url: `https://www.youtube.com/watch?v=${vid}`,
      raw: {
        // 必要ならプラットフォーム固有フィールドを残す
        videoId: vid,
      },
    };
  });

  // Twitch クライアント情報も env から取得（Cloudflare または process.env）
  const CLIENT_ID =
    (context?.cloudflare?.env?.TWITCH_CLIENT_ID as string) ||
    process.env.TWITCH_CLIENT_ID ||
    "";
  const CLIENT_SECRET =
    (context?.cloudflare?.env?.TWITCH_CLIENT_SECRET as string) ||
    process.env.TWITCH_CLIENT_SECRET ||
    "";

  // Twitch の取得は失敗しても YouTube データを返せるように try/catch する
  let twitchItems = [];
  try {
    const token = await getTwitchToken(CLIENT_ID, CLIENT_SECRET);
    const streams = await fetchTwitchStreams(token, CLIENT_ID, maxResults);
    twitchItems = streams.map((s) => ({
      id: `twitch_${s.id}`,
      platform: "twitch",
      title: s.title ?? "",
      thumbnailUrl: (s.thumbnail_url || "").replace("{width}", "640").replace("{height}", "360"),
      viewers: Number(s.viewer_count ?? 0),
      url: `https://www.twitch.tv/${s.user_login}`,
      raw: {
        user_name: s.user_name,
      },
    }));
  } catch (e) {
    console.error("Twitch fetch failed:", e);
  }

  // 結合してレスポンスを作る
  const all = [...youtubeItems, ...twitchItems];
  const byPlatform = {
    youtube: youtubeItems,
    twitch: twitchItems,
  };

  // KV に保存（Cloudflare が利用可能な場合）
  try {
    if (context?.cloudflare?.env?.LIVE?.put) {
      await context.cloudflare.env.LIVE.put(
        "live-json",
        JSON.stringify({ all, byPlatform, updatedAt: new Date().toISOString() })
      );
    }
  } catch (e) {
    console.error("KV put failed:", e);
  }

  return Response.json({ all, byPlatform });
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


async function fetchTwitchStreams(token: string, TWITCH_CLIENT_ID: string, limit = 10) {
  const url = `https://api.twitch.tv/helix/streams?first=${limit}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Twitchのストリーム取得に失敗しました:", err);
    throw new Error(`Twitch API failed: ${res.status}`);
  }

  const data = await res.json();
  return data.data; // ストリームリスト
}