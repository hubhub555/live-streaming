import { useEffect, useState } from 'react';
import LiveCard from './Card';

// types.ts
export interface Video {
  liveLink: string;
  platform: 'youtube' | 'twitch' | 'nicovideo' | string;
  thumbNailLink?: string; // 省略される可能性もあるならオプショナル
  thumbnailUrl?: string; // あなたのAPIレスポンスに合わせて両方許可
  title?: string;
}

export default function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // const formatPlatform = (platform: string) => {
  //   const map: Record<string, string> = {
  //     youtube: 'YouTube',
  //     twitch: 'Twitch',
  //     nicovideo: 'ニコニコ動画',
  //   };
  //   return map[platform] || platform;
  // };

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch('/api/live');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setVideos(json.live || []);
        console.log(json)
        console.log(videos)
      } catch (err) {
        console.error('動画データ取得失敗:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-100 dark:bg-slate-900 font-display">
      <header className="sticky top-0 z-10 flex items-center bg-slate-100/80 dark:bg-slate-900/80 p-4 pb-2 justify-between backdrop-blur-sm">
        <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          「ゲーム実況」の人気動画ランキング
        </h1>
        <div className="flex size-12 shrink-0 items-center"></div>
      </header>

      <div className="flex gap-3 px-4 py-2 overflow-x-auto">
        <div className="flex h-8 items-center justify-center gap-x-2 rounded-full bg-orange-500/20 pl-4 pr-4">
          <p className="text-orange-500 text-sm font-medium">ゲーム実況</p>
        </div>
      </div>

      <main className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-600 border-t-orange-500"></div>
          </div>
        ) : videos.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-center py-8">
            動画が見つかりませんでした
          </p>
        ) : (
          <div className="video-grid">
            {videos.map((v, i) => (
              <LiveCard key={i} video={v} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
