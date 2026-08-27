'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Activity = {
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
  createdAt: string;
};

type FormStatus = { type: 'idle' | 'sending' | 'success' | 'error'; message?: string };

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
const sheetHeaders = ['場次編號', '青創名稱', '活動日期', '上刊日期', '宣傳文案', '圖檔連結', '協助設計圖檔', '報名連結', '其他備註', '提交時間'];
const sheetLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' }).format(parseLocalDate(value));
}

function formatCreatedAt(value: string) {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Taipei' }).format(date);
}

function csvCell(value: string | number | null) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1, 12);
  const gridStart = new Date(year, monthIndex, 1 - firstDay.getDay(), 12);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date, key: toDateKey(date), inMonth: date.getMonth() === monthIndex };
  });
}

export function CurrentDateCard() {
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => setToday(new Date()), []);

  if (!today) {
    return <div className="date-card" aria-hidden="true"><span className="date-number">—</span></div>;
  }

  return (
    <div className="date-card">
      <span className="date-number">{today.getDate()}</span>
      <div>
        <strong>{today.getMonth() + 1} 月</strong>
        <small>{new Intl.DateTimeFormat('zh-TW', { weekday: 'long' }).format(today)}</small>
      </div>
    </div>
  );
}

export default function PortalSections() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>({ type: 'idle' });
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [workspaceView, setWorkspaceView] = useState<'calendar' | 'sheet'>('calendar');

  useEffect(() => {
    let active = true;
    fetch('/api/activities', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as { activities?: Activity[]; message?: string };
        if (!response.ok) throw new Error(data.message || '無法讀取活動資料。');
        if (active) setActivities(data.activities ?? []);
      })
      .catch((error: Error) => active && setLoadError(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const activitiesByDate = useMemo(() => {
    const grouped = new Map<string, Activity[]>();
    activities.forEach((activity) => {
      const dayActivities = grouped.get(activity.publishDate) ?? [];
      dayActivities.push(activity);
      grouped.set(activity.publishDate, dayActivities);
    });
    return grouped;
  }, [activities]);

  const monthActivities = useMemo(
    () => activities.filter((activity) => {
      const date = parseLocalDate(activity.publishDate);
      return date.getFullYear() === visibleMonth.getFullYear() && date.getMonth() === visibleMonth.getMonth();
    }),
    [activities, visibleMonth],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus({ type: 'sending' });
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      sessionNumber: String(formData.get('sessionNumber') ?? ''),
      youthProjectName: String(formData.get('youthProjectName') ?? ''),
      activityDate: String(formData.get('activityDate') ?? ''),
      publishDate: String(formData.get('publishDate') ?? ''),
      promotionCopy: String(formData.get('promotionCopy') ?? ''),
      imageUrl: String(formData.get('imageUrl') ?? ''),
      needsDesign: formData.get('needsDesign') === 'true',
      registrationUrl: String(formData.get('registrationUrl') ?? ''),
      notes: String(formData.get('notes') ?? ''),
    };

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { activity?: Activity; message?: string };
      if (!response.ok || !data.activity) throw new Error(data.message || '資料送出失敗。');

      setActivities((current) => [...current, data.activity!].sort((a, b) => a.publishDate.localeCompare(b.publishDate)));
      setVisibleMonth(new Date(parseLocalDate(data.activity.publishDate).getFullYear(), parseLocalDate(data.activity.publishDate).getMonth(), 1, 12));
      setSelectedActivity(data.activity);
      setFormStatus({ type: 'success', message: '活動已送出，並自動加入上刊月曆。' });
      form.reset();
    } catch (error) {
      setFormStatus({ type: 'error', message: error instanceof Error ? error.message : '資料送出失敗。' });
    }
  }

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
    setSelectedActivity(null);
  }

  function returnToCurrentMonth() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
    setSelectedActivity(null);
  }

  function exportActivitiesCsv() {
    const rows = activities.map((activity) => [
      activity.sessionNumber,
      activity.youthProjectName,
      activity.activityDate,
      activity.publishDate,
      activity.promotionCopy,
      activity.imageUrl,
      activity.needsDesign ? '是' : '否',
      activity.registrationUrl,
      activity.notes,
      formatCreatedAt(activity.createdAt),
    ]);
    const csv = `\uFEFF${[sheetHeaders, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `青創活動提交資料_${toDateKey(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="resources-section" id="resources" aria-labelledby="resources-title">
        <div className="section-kicker"><span>01</span> 資料彙整區</div>
        <div className="wide-heading">
          <div><h2 id="resources-title">執行計畫，<br />先從找對資料開始。</h2></div>
          <p>資料懶人包與常用連結將持續更新。目前先提供活動圖檔上傳入口，其餘內容待後續補上。</p>
        </div>
        <div className="resource-list">
          <div className="resource-row is-pending">
            <span className="resource-icon" aria-hidden="true">◌</span>
            <div><span className="resource-type">計畫懶人包</span><h3>青創計畫執行指引</h3><p>執行流程、重要節點與常見問題。</p></div>
            <span className="pending-tag">準備中</span>
          </div>
          <div className="resource-row is-pending">
            <span className="resource-icon" aria-hidden="true">✐</span>
            <div><span className="resource-type">宣傳工具</span><h3>活動宣傳素材與文案範本</h3><p>宣傳時程、文案格式與建議圖檔尺寸。</p></div>
            <span className="pending-tag">準備中</span>
          </div>
          <a className="resource-row is-active" href="https://reurl.cc/WzadZe" target="_blank" rel="noreferrer">
            <span className="resource-icon" aria-hidden="true">↑</span>
            <div><span className="resource-type">圖檔上傳</span><h3>活動圖檔共用資料夾</h3><p>請先將圖檔上傳，再把共享連結貼入活動表單。</p></div>
            <span className="resource-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="form-section" id="activity-form" aria-labelledby="form-title">
        <div className="form-intro">
          <div className="section-kicker light"><span>02</span> 內部活動表單</div>
          <h2 id="form-title">把活動資訊<br />一次交清楚。</h2>
          <p>表單送出後，資料會即時收錄至平台組工作區，並依「上刊日期」顯示在月曆。</p>
          <div className="form-tip"><span aria-hidden="true">i</span><p><strong>送出前提醒</strong>圖檔請先上傳至共用資料夾，再貼上可存取的連結。</p></div>
        </div>

        <form className="activity-form" onSubmit={handleSubmit}>
          <div className="form-progress"><span>ACTIVITY BRIEF</span><span>01 — 09</span></div>
          <div className="form-grid">
            <label className="field"><span className="field-label-with-link"><span>場次編號 <b>*</b></span><a href="https://docs.google.com/spreadsheets/d/1WuoUipLJK6iEVdCIeOcmdCcbQu_74j7tvu2yD0Xqoso/edit?gid=359503767#gid=359503767" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>第一年核定總表 ↗</a></span><input name="sessionNumber" required maxLength={80} placeholder="例：NJ001A" /></label>
            <label className="field"><span>青創名稱 <b>*</b></span><input name="youthProjectName" required maxLength={120} placeholder="請填寫伙伴的計畫名稱" /></label>
            <label className="field"><span>活動日期 <b>*</b></span><input type="date" name="activityDate" required /></label>
            <label className="field"><span>上刊日期 <b>*</b></span><input type="date" name="publishDate" required /></label>
            <label className="field full"><span>宣傳文案 <b>*</b></span><textarea name="promotionCopy" required maxLength={5000} rows={6} placeholder="請貼上完整宣傳訊息，包含活動主題、時間、地點與參與方式…" /></label>
            <label className="field full"><span>圖檔連結 <b>*</b></span><div className="input-with-link"><input type="url" name="imageUrl" required maxLength={1000} placeholder="https://" /><a href="https://reurl.cc/WzadZe" target="_blank" rel="noreferrer">開啟上傳資料夾 ↗</a></div></label>
            <fieldset className="field full radio-field"><legend>是否需要協助設計圖檔 <b>*</b></legend><div className="radio-options"><label><input type="radio" name="needsDesign" value="true" required /><span>是，需要協助</span></label><label><input type="radio" name="needsDesign" value="false" required /><span>否，已備妥圖檔</span></label></div></fieldset>
            <label className="field"><span>報名連結 <em>選填</em></span><input type="url" name="registrationUrl" maxLength={1000} placeholder="Google 表單或其他報名頁面" /></label>
            <label className="field"><span>其他備註 <em>選填</em></span><input name="notes" maxLength={3000} placeholder="其他希望平台組注意的訊息" /></label>
          </div>

          {formStatus.type !== 'idle' && formStatus.type !== 'sending' && (
            <div className={`form-message ${formStatus.type}`} role="status">{formStatus.message}</div>
          )}
          <div className="form-submit-row">
            <span><b>*</b> 為必填欄位，送出前請再次確認日期。</span>
            <button type="submit" disabled={formStatus.type === 'sending'}>
              {formStatus.type === 'sending' ? '送出中…' : '送出活動資訊'} <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>

      <section className="workspace-section" id="workspace" aria-labelledby="workspace-title">
        <div className="section-kicker"><span>03</span> 平台組工作區</div>
        <div className="workspace-heading">
          <div><h2 id="workspace-title">月曆與明細，<br />全部放在同一個工作區。</h2><p>用月曆掌握上刊排程，或切換到資料表逐條檢視伙伴送出的完整內容。</p></div>
          <div className="workspace-stat"><strong>{workspaceView === 'calendar' ? monthActivities.length : activities.length}</strong><span>{workspaceView === 'calendar' ? <>{visibleMonth.getMonth() + 1} 月<br />待上刊場次</> : <>累積<br />提交筆數</>}</span></div>
        </div>

        <div className="workspace-tabbar">
          <div className="workspace-tabs" role="tablist" aria-label="工作區檢視方式">
            <button type="button" role="tab" aria-selected={workspaceView === 'calendar'} aria-controls="calendar-panel" className={workspaceView === 'calendar' ? 'active' : ''} onClick={() => setWorkspaceView('calendar')}><span aria-hidden="true">▦</span> 上刊月曆</button>
            <button type="button" role="tab" aria-selected={workspaceView === 'sheet'} aria-controls="sheet-panel" className={workspaceView === 'sheet' ? 'active' : ''} onClick={() => setWorkspaceView('sheet')}><span aria-hidden="true">≣</span> 活動資料表</button>
          </div>
          {workspaceView === 'sheet' && <button className="csv-button" type="button" onClick={exportActivitiesCsv} disabled={!activities.length}><span aria-hidden="true">↓</span> 輸出 CSV</button>}
        </div>

        {loadError && <div className="calendar-error workspace-error" role="alert">{loadError}</div>}

        {workspaceView === 'calendar' ? (
          <div className="calendar-shell" id="calendar-panel" role="tabpanel">
            <div className="calendar-toolbar">
              <div><span className="calendar-label">PUBLICATION CALENDAR</span><h3>{visibleMonth.getFullYear()} <b>/</b> {pad(visibleMonth.getMonth() + 1)}</h3></div>
              <div className="calendar-controls">
                <button type="button" onClick={() => moveMonth(-1)} aria-label="上一個月">←</button>
                <button className="today-button" type="button" onClick={returnToCurrentMonth}>今月</button>
                <button type="button" onClick={() => moveMonth(1)} aria-label="下一個月">→</button>
              </div>
            </div>

            <div className="calendar-scroll">
              <div className="calendar-grid" aria-busy={loading}>
                {weekdayLabels.map((weekday) => <div className="weekday" key={weekday}>週{weekday}</div>)}
                {calendarDays.map((day) => {
                  const dayActivities = activitiesByDate.get(day.key) ?? [];
                  const isToday = day.key === toDateKey(new Date());
                  return (
                    <div className={`calendar-day ${day.inMonth ? '' : 'outside'} ${isToday ? 'today' : ''}`} key={day.key}>
                      <span className="day-number">{day.date.getDate()}</span>
                      <div className="day-events">
                        {dayActivities.map((activity) => (
                          <button type="button" className={selectedActivity?.id === activity.id ? 'active' : ''} onClick={() => setSelectedActivity(activity)} key={activity.id} title={`${activity.youthProjectName} · ${activity.sessionNumber}`}>
                            <span>{activity.sessionNumber}</span>{activity.youthProjectName}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="calendar-detail" aria-live="polite">
              {selectedActivity ? (
                <>
                  <div className="detail-date"><span>上刊</span><strong>{formatDate(selectedActivity.publishDate)}</strong></div>
                  <div className="detail-main"><span>{selectedActivity.sessionNumber}</span><h4>{selectedActivity.youthProjectName}</h4><p>{selectedActivity.promotionCopy}</p></div>
                  <div className="detail-meta"><span>活動日期 <b>{formatDate(selectedActivity.activityDate)}</b></span><span>圖檔設計 <b>{selectedActivity.needsDesign ? '需協助' : '已備妥'}</b></span></div>
                  <div className="detail-links"><a href={selectedActivity.imageUrl} target="_blank" rel="noreferrer">圖檔 ↗</a>{selectedActivity.registrationUrl && <a href={selectedActivity.registrationUrl} target="_blank" rel="noreferrer">報名頁 ↗</a>}</div>
                </>
              ) : (
                <div className="empty-detail">
                  <span aria-hidden="true">{loading ? '…' : '↖'}</span>
                  <p>{loading ? '正在載入活動資料…' : monthActivities.length ? '點選月曆中的活動，查看上刊摘要。' : '這個月份尚無上刊項目；表單送出後會自動顯示於此。'}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="sheet-shell" id="sheet-panel" role="tabpanel">
            <div className="sheet-toolbar"><div><span className="calendar-label">ACTIVITY SUBMISSIONS</span><h3>活動提交資料</h3></div><span>{loading ? '載入中…' : `共 ${activities.length} 筆`}</span></div>
            <div className="sheet-scroll">
              <table className="activity-sheet" aria-busy={loading}>
                <thead>
                  <tr className="sheet-letters"><th className="sheet-corner" aria-label="列號" />{sheetLetters.map((letter) => <th key={letter}>{letter}</th>)}</tr>
                  <tr><th className="row-number">#</th>{sheetHeaders.map((header) => <th key={header}>{header}</th>)}</tr>
                </thead>
                <tbody>
                  {activities.length ? activities.map((activity, index) => (
                    <tr key={activity.id}>
                      <th className="row-number" scope="row">{index + 1}</th>
                      <td className="sheet-code">{activity.sessionNumber}</td>
                      <td>{activity.youthProjectName}</td>
                      <td>{activity.activityDate}</td>
                      <td>{activity.publishDate}</td>
                      <td className="sheet-long" title={activity.promotionCopy}>{activity.promotionCopy}</td>
                      <td><a href={activity.imageUrl} target="_blank" rel="noreferrer">開啟圖檔 ↗</a></td>
                      <td>{activity.needsDesign ? '是' : '否'}</td>
                      <td>{activity.registrationUrl ? <a href={activity.registrationUrl} target="_blank" rel="noreferrer">開啟報名頁 ↗</a> : '—'}</td>
                      <td className="sheet-long" title={activity.notes ?? ''}>{activity.notes || '—'}</td>
                      <td>{formatCreatedAt(activity.createdAt)}</td>
                    </tr>
                  )) : (
                    <tr><td className="sheet-empty" colSpan={11}>{loading ? '正在載入活動資料…' : '目前尚無提交資料，新表單送出後會立即出現於此。'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="sheet-footer"><span>最後同步：開啟頁面時</span><span>資料將依上刊日期排序</span></div>
          </div>
        )}
      </section>

      <footer>
        <div className="footer-brand"><span className="brand-mark" aria-hidden="true">NG</span><div><strong>台北市南港機廠社宅</strong><span>青年創新回饋計畫入口網</span></div></div>
        <p>為青創伙伴打造的資料與協作入口。</p>
        <a href="#top">回到頂端 ↑</a>
      </footer>
    </>
  );
}
