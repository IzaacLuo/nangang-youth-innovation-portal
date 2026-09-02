'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

export default function PublicActivityDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [activity, setActivity] = useState<PublicActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/public/activities/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as { activity?: PublicActivity; message?: string };
        if (!response.ok || !data.activity) throw new Error(data.message || '找不到這場活動。');
        setActivity(data.activity);
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug) return;

    setSubmitting(true);
    setSubmitMessage('');
    setSubmitError('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? ''),
      notes: String(formData.get('notes') ?? ''),
      website: String(formData.get('website') ?? ''),
    };

    try {
      const response = await fetch(`/api/public/activities/${encodeURIComponent(slug)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || '報名失敗。');

      event.currentTarget.reset();
      setSubmitMessage('報名成功！我們已收到您的資料，活動前若有異動會再與您聯繫。');
    } catch (submitErr) {
      setSubmitError(submitErr instanceof Error ? submitErr.message : '報名失敗。');
    } finally {
      setSubmitting(false);
    }
  }

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
        <Link className="public-login-link" href="/活動">← 返回活動列表</Link>
      </header>

      {loading && <p className="public-status">正在載入活動…</p>}
      {error && <p className="public-status error" role="alert">{error}</p>}

      {activity && (
        <section className="public-detail-section">
          <div className="public-detail-copy">
            <span className="public-activity-kicker">{activity.sessionNumber}</span>
            <h1>{activity.youthProjectName}</h1>
            <div className="public-detail-meta">
              <span>活動日期 <strong>{formatDate(activity.activityDate)}</strong></span>
              <span>上刊日期 <strong>{formatDate(activity.publishDate)}</strong></span>
            </div>
            <p className="public-detail-body">{activity.promotionCopy}</p>
            {activity.imageUrl && (
              <a className="public-detail-image-link" href={activity.imageUrl} target="_blank" rel="noreferrer">
                查看活動圖檔 ↗
              </a>
            )}
          </div>

          <form className="public-register-form" onSubmit={handleSubmit}>
            <h2>活動報名</h2>
            <p>請填寫以下資料完成報名。標示 <b>*</b> 為必填。</p>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="public-honeypot" aria-hidden="true" />
            <label className="field"><span>姓名 <b>*</b></span><input name="name" required maxLength={80} /></label>
            <label className="field"><span>聯絡電話 <b>*</b></span><input name="phone" required maxLength={40} /></label>
            <label className="field"><span>Email <em>選填</em></span><input type="email" name="email" maxLength={120} /></label>
            <label className="field full"><span>備註 <em>選填</em></span><textarea name="notes" rows={4} maxLength={1000} placeholder="如有特殊需求或想補充的資訊，請在此填寫。" /></label>
            {submitMessage && <div className="form-message success" role="status">{submitMessage}</div>}
            {submitError && <div className="form-message error" role="alert">{submitError}</div>}
            <button type="submit" disabled={submitting}>{submitting ? '送出中…' : '確認報名'}</button>
          </form>
        </section>
      )}
    </main>
  );
}
