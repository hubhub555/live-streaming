// 動画データの型定義
export interface Video {
  liveLink?: string;
  platform: 'youtube' | 'twitch' | 'nicovideo' | string;
  thumbnailUrl?: string;
  thumbNailLink?: string; // APIによって大小混在する場合
  title?: string;
  videoId?: string;
}

// props の型定義
interface CardProps {
  video: Video;
  index: number;
}

export default function Card({ video, index }: CardProps) {
  const rank = index + 1;

  // ランクごとの色設定
  const rankColors: Record<number, string> = {
    1: '#ffd700', // 金
    2: '#c0c0c0', // 銀
    3: '#cd7f32', // 銅
  };

  const rankColor = rankColors[rank] || '#6b7280';
  const imageUrl = video.thumbnailUrl || video.thumbNailLink || '';
  const liveLink =
    video.liveLink ||
    (video.platform === 'youtube' && video.videoId
      ? `https://www.youtube.com/watch?v=${video.videoId}`
      : video.liveLink || '#');

  return (
    <div className="max-w-full">
      <a
        className="flex flex-col items-stretch justify-start rounded-xl group transition-transform duration-200 ease-in-out hover:scale-[1.02]"
        href={liveLink}
        target="_blank"
        rel="noreferrer"
      >
<div className="relative w-full aspect-video overflow-hidden rounded-xl">
  {imageUrl ? (
    <img
      src={imageUrl}
      alt={video.title || 'ライブ配信のサムネイル'}
      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      loading="lazy"
    />
  ) : (
    <div className="w-full h-full bg-slate-200 dark:bg-slate-700" />
  )}

  <div className="absolute top-2 left-2 flex items-center justify-center gap-1 rounded-full bg-black/50 px-3 py-1 text-sm font-bold text-white backdrop-blur-sm">
    <span
      className="material-symbols-outlined text-base"
      style={{ color: rankColor }}
    >
      emoji_events
    </span>
    <span>{rank}</span>
  </div>
</div>


        <div className="flex w-full min-w-72 flex-col justify-center gap-1 py-4">
          <h2 className="text-slate-900 dark:text-white text-lg font-bold">
            {video.title || 'タイトル不明'}
          </h2>
          <p className="text-slate-600 dark:text-[#b89d9f]">
            {video.platform === 'youtube' ? 'YouTube' : 'ライブ配信'}
          </p>
        </div>
      </a>
    </div>
  );
}
