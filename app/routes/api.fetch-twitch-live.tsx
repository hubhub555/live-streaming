import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {

  const CLIENT_ID = "";
  const CLIENT_SECRET = "";

  const token = await getTwitchToken(CLIENT_ID, CLIENT_SECRET);
  const twitchLives = await fetchTopGames(token, CLIENT_ID, 10)

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
  return Response.json({ data: twitchLives });
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

  return data; // ゲームリスト
}

