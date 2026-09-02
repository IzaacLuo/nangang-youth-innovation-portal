'use client';

import { useEffect, useMemo, useState } from 'react';

import { buildPublicActivityPath } from '../../lib/slug';
import type { PublicAccount } from '../lib/client-auth';

type DesignStatus = '未開始' | '不需要' | '進行中' | '完成';
type PublicationStatus = '未開始' | '已排程' | '已刊登';

export type HubActivity = {
  id: number;
  sessionNumber: string;
  youthProjectName: string;
  activityDate: string;
  publishDate: string;
  promotionCopy: string;
  imageUrl: string;
  needsDesign: boolean;
  registrationUrl: string | null;
  notes: string | null;
  slug: string;
  submittedBy: string;
  designStatus: DesignStatus;
  publicationStatus: PublicationStatus;
  assignee: string;
  createdAt: string;
};

type Registration = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function formatCreatedAt(value: string) {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Taipei' }).format(date);
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement('textarea');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

export default function ActivityHub({
  account,
  isAdmin,
  highlightActivityId = null,
  refreshToken = 0,
}: {
  account: PublicAccount | null;
  isAdmin: boolean;
  highlightActivityId?: number | null;
  refreshToken?: number;
}) {
  const [activities, setActivities] = useState<HubActivity[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<Record<number, string>>({});
  const [selectedActivity, setSelectedActivity] = useState<HubActivity | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState('');

  useEffect(() => {
    if (!account) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    fetch('/api/activities?scope=mine', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as { activities?: HubActivity[]; message?: string };
        if (!response.ok) throw new Error(data.message || '無法讀取活動資料。');
        if (!active) return;
        const nextActivities = data.activities ?? [];
        setActivities(nextActivities);
        return Promise.all(nextActivities.map(async (activity) => {
          const regResponse = await fetch(`/api/activities/${activity.id}/registrations`, { cache: 'no-store' });
          if (!regResponse.ok) return [activity.id, 0] as const;
          const regData = (await regResponse.json()) as { total?: number; registrations?: Registration[] };
          return [activity.id, regData.total ?? regData.registrations?.length ?? 0] as const;
        }));
      })
      .then((pairs) => {
        if (!pairs || !active) return;
        setRegistrationCounts(Object.fromEntries(pairs));
      })
      .catch((fetchError: Error) => active && setError(fetchError.message))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [account, refreshToken]);

  useEffect(() => {
    if (!highlightActivityId) return;
    const target = document.getElementById('activity-hub');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightActivityId, activities.length]);

  const visibleActivities = useMemo(() => {
    if (isAdmin) return activities;
    return activities.filter((activity) => activity.submittedBy === account?.code);
  }, [activities, account?.code, isAdmin]);

  async function handleCopyLink(activity: HubActivity) {
    const origin = window.location.origin;
    const path = buildPublicActivityPath(activity.slug);
    try {
      await copyText(`${origin}${path}`);
      setCopyStatus((current) => ({ ...current, [activity.id]: '已複製報名連結' }));
    } catch {
      setCopyStatus((current) => ({ ...current, [activity.id]: '複製失敗，請手動複製' }));
    }
  }

  async function openRegistrations(activity: HubActivity) {
    setSelectedActivity(activity);
    setRegistrations([]);
    setRegistrationsError('');
    setRegistrationsLoading(true);

    try {
      const response = await fetch(`/api/activities/${activity.id}/registrations`, { cache: 'no-store' });
      const data = (await response.json()) as { registrations?: Registration[]; message?: string };
      if (!response.ok) throw new Error(data.message || '無法讀取報名名單。');
      setRegistrations(data.registrations ?? []);
    } catch (fetchError) {
      setRegistrationsError(fetchError instanceof Error ? fetchError.message : '無法讀取報名名單。');
    } finally {
      setRegistrationsLoading(false);
    }
  }

  return (
    <section className="activity-hub-section" id="activity-hub" aria-labelledby="activity-hub-title">
      <div className="section-kicker"><span>03</span> 活動資料區</div>
      <div className="activity-hub-heading">
        <div>
          <h2 id="activity-hub-title">我的活動<br />與報名管理。</h2>
          <p>查看已提交的活動、複製公開報名連結，並追蹤報名名單。居民可在 <a href="/活動" target="_blank" rel="noreferrer">/活動</a> 瀏覽已公開場次。</p>
        </div>
        <div className="activity-hub-stat">
          <strong>{visibleActivities.length}</strong>
          <span>已提交<br />活動</span>
        </div>
      </div>

      {error && <div className="calendar-error workspace-error" role="alert">{error}</div>}

      <div className="activity-hub-list" aria-busy={loading}>
        {loading && <p className="activity-hub-empty">正在載入活動資料…</p>}
        {!loading && visibleActivities.length === 0 && (
          <p className="activity-hub-empty">尚無提交紀錄。完成活動填報後，資料會出現在這裡。</p>
        )}
        {visibleActivities.map((activity) => (
          <article
            className={`activity-hub-card ${highlightActivityId === activity.id ? 'highlighted' : ''}`}
            key={activity.id}
          >
            <div className="activity-hub-card-top">
              <span>{activity.sessionNumber}</span>
              <strong>{activity.youthProjectName}</strong>
            </div>
            <div className="activity-hub-card-meta">
              <span>活動 {formatDate(activity.activityDate)}</span>
              <span>上刊 {formatDate(activity.publishDate)}</span>
              <span>報名 {registrationCounts[activity.id] ?? 0} 人</span>
            </div>
            <div className="activity-hub-card-status">
              <span>設計 <b>{activity.designStatus}</b></span>
              <span>發布 <b>{activity.publicationStatus}</b></span>
            </div>
            <p className="activity-hub-card-copy">{activity.promotionCopy}</p>
            <div className="activity-hub-card-actions">
              <button type="button" onClick={() => handleCopyLink(activity)}>複製報名連結</button>
              <button type="button" onClick={() => openRegistrations(activity)}>查看報名名單</button>
              <a href={buildPublicActivityPath(activity.slug)} target="_blank" rel="noreferrer">預覽公開頁 ↗</a>
            </div>
            {copyStatus[activity.id] && <small className="activity-hub-copy-status">{copyStatus[activity.id]}</small>}
            <small className="activity-hub-created">提交時間 {formatCreatedAt(activity.createdAt)}</small>
          </article>
        ))}
      </div>

      {selectedActivity && (
        <div className="confirm-backdrop">
          <div className="confirm-dialog activity-hub-dialog" role="dialog" aria-modal="true" aria-labelledby="registrations-title">
            <span className="confirm-kicker">REGISTRATIONS</span>
            <h3 id="registrations-title">{selectedActivity.sessionNumber} · 報名名單</h3>
            <p>{selectedActivity.youthProjectName}</p>
            {registrationsLoading && <p>正在載入報名資料…</p>}
            {registrationsError && <div className="confirm-error" role="alert">{registrationsError}</div>}
            {!registrationsLoading && !registrationsError && registrations.length === 0 && (
              <p>目前尚無報名資料。</p>
            )}
            {!registrationsLoading && registrations.length > 0 && (
              <div className="registration-table-wrap">
                <table className="registration-table">
                  <thead>
                    <tr><th>姓名</th><th>電話</th><th>Email</th><th>備註</th><th>時間</th></tr>
                  </thead>
                  <tbody>
                    {registrations.map((registration) => (
                      <tr key={registration.id}>
                        <td>{registration.name}</td>
                        <td>{registration.phone}</td>
                        <td>{registration.email || '—'}</td>
                        <td>{registration.notes || '—'}</td>
                        <td>{formatCreatedAt(registration.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="confirm-actions">
              <button type="button" onClick={() => setSelectedActivity(null)}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
