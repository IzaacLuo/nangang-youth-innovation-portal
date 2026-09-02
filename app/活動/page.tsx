'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PublicActivity = {
  id: number;
  sessionNumber: string;
  youthProjectName: string;
  activityDate: string;
  publishDate: string;
  promotionCopy: string;
  imageUrl: string;
  slug: string;
};

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export default function PublicActivitiesPage() {
  const [activities, setActivities] = useState<PublicActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/public/activities', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as { activities?: PublicActivity[]; message?: string };
        if (!response.ok) throw new Error(data.message || '無法讀取活動資料。');
        setActivities(data.activities ?? []);
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="public-page">
      <header className="public-header">
        <Link className="brand" href="/活動">
          <span className="brand-mark" aria-hidden="true">NG</span>
          <span>
            <strong>南港機廠社宅</strong>
            <small>社區活動報名</small>
          </span>
        </Link>
        <Link className="public-login-link" href="/login">青創入口 ↗</Link>
      </header>

      <section className="public-hero">
        <span className="eyebrow"><span /> 社宅居民活動</span>
        <h1>社區活動<br />一起參與。</h1>
        <p>瀏覽近期開放報名的社區活動，點選場次即可查看詳情並完成報名。</p>
      </section>

      <section className="public-list-section">
        {loading && <p className="public-status">正在載入活動…</p>}
        {error && <p className="public-status error" role="alert">{error}</p>}
        {!loading && !error && activities.length === 0 && (
          <p className="public-status">目前尚無開放報名的活動，請稍後再來看看。</p>
        )}
        <div className="public-activity-grid">
          {activities.map((activity) => (
            <Link className="public-activity-card" href={`/活動/${activity.slug}`} key={activity.id}>
              <span className="public-activity-kicker">{activity.sessionNumber}</span>
              <h2>{activity.youthProjectName}</h2>
              <p>{activity.promotionCopy.slice(0, 120)}{activity.promotionCopy.length > 120 ? '…' : ''}</p>
              <div className="public-activity-meta">
                <span>活動日期 <strong>{formatDate(activity.activityDate)}</strong></span>
                <span>立即報名 →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
