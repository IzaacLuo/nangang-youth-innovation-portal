'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import ActivityHub from './ActivityHub';
import type { PublicAccount } from '../lib/client-auth';
import { buildPublicActivityPath } from '../../lib/slug';

type DesignStatus = '未開始' | '不需要' | '進行中' | '完成';
type PublicationStatus = '未開始' | '已排程' | '已刊登';

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
  slug: string;
  submittedBy: string;
  designStatus: DesignStatus;
  publicationStatus: PublicationStatus;
  assignee: string;
  createdAt: string;
};

type FormStatus = { type: 'idle' | 'sending' | 'success' | 'error'; message?: string };
type UploadStatus = { type: 'idle' | 'uploading' | 'success' | 'error'; message?: string };
type TrackingDraft = Pick<Activity, 'designStatus' | 'publicationStatus' | 'assignee'>;
type RowSaveStatus = 'saving' | 'saved' | 'error';
type WorkspaceView = 'publish-calendar' | 'activity-calendar' | 'sheet';

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
const sheetHeaders = ['場次編號', '青創名稱', '活動日期', '上刊日期', '宣傳文案', '圖檔連結', '協助設計圖檔', '設計圖稿接案', '發布狀態', '人員', '公開報名頁', '其他備註', '提交時間'];
const sheetDisplayHeaders = [...sheetHeaders, '操作'];
const sheetLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
const designStatusOptions: DesignStatus[] = ['未開始', '不需要', '進行中', '完成'];
const publicationStatusOptions: PublicationStatus[] = ['未開始', '已排程', '已刊登'];

const resourceShortcuts = [
  {
    label: '核銷注意事項',
    description: '請款與核銷前必讀的處理原則。',
    type: 'Google Drive',
    href: 'https://drive.google.com/file/d/1Pbpe9LK2o5ZvK9JHcHl69mx2hdZkJwaS/view',
  },
  {
    label: '第一年核定總表',
    description: '查詢計畫、場次編號與核定資訊。',
    type: 'Google Sheets',
    href: 'https://docs.google.com/spreadsheets/d/1WuoUipLJK6iEVdCIeOcmdCcbQu_74j7tvu2yD0Xqoso/edit?usp=drive_link',
  },
  {
    label: '《NJ南港機廠經費資材清單》',
    description: '登錄各計畫的經費資材；填寫時請搭配公共資材管理原則。',
    type: 'Google Sheets',
    href: 'https://docs.google.com/spreadsheets/d/1V-7o7WK2ASvI411djwh66fV6lHpa4X7C/edit?gid=1886939676#gid=1886939676',
  },
  {
    label: '《公共資材管理原則（草案）》',
    description: '資材清單的填寫方法、使用規範與管理原則。',
    type: 'Google Docs',
    href: 'https://docs.google.com/document/d/1J4Ny_onvCUSXPLKaUVi_Ls5abw7mKZWyYeiaJnVk3QQ/edit?tab=t.0',
  },
];

const postEventChecklist = [
  { number: '01', title: '簽到表', description: '保留活動參與者的完整簽到紀錄。', links: [] },
  { number: '02', title: '活動照片', description: '留存可辨識活動內容與參與情形的影像。', links: [] },
  { number: '03', title: '問卷回饋', description: '完成參與者回饋收集與後續整理。', links: [{ label: '開啟問卷回饋資料夾', href: 'https://drive.google.com/drive/folders/15Rmh_kFR2g-QkyzPtU6pIFIrpVo8Ee0y?usp=drive_link' }] },
  { number: '04', title: '支出憑證', description: '包含發票、收據與採購明細。', links: [] },
  { number: '05', title: '收款或收據紀錄', description: '活動若有收費，請完整留存相關紀錄。', links: [{ label: '開啟收款或收據紀錄', href: 'https://docs.google.com/document/d/1AFE4lUiRunsyri17DPlVVOhGeBLsose8/edit?usp=sharing&ouid=111334491920239465575&rtpof=true&sd=true' }] },
  { number: '06', title: 'B 表成果紀錄', description: '依活動型態填寫場次型或持續型成果表。', links: [{ label: 'B1 表｜場次型活動', href: 'https://forms.gle/dq19qgmQvkhVB6XL7' }, { label: 'B2 表｜持續型活動', href: 'https://forms.gle/eHZ9LEbX4qCL3tqM9' }] },
  { number: '07', title: '核銷明細', description: '填寫線上請款單，並將核銷憑證上傳至指定資料夾。', links: [{ label: '線上請款單', href: 'https://docs.google.com/spreadsheets/d/1SLrT4FijYD8_6fX_Z46aCQ-ZoVPAvS37OEpaxy-oKDE/edit?usp=drive_link' }, { label: '上傳憑證資料夾', href: 'https://drive.google.com/drive/folders/1POhvrRq9trzU0Wm8-xK5HPcc_Z9UnskX?usp=drive_link' }] },
];

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

export default function PortalSections({
  isAdmin = false,
  account = null,
}: {
  isAdmin?: boolean;
  account?: PublicAccount | null;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [adminProjectOptions, setAdminProjectOptions] = useState<string[]>([]);
  const [selectedYouthProjectName, setSelectedYouthProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>({ type: 'idle' });
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: 'idle' });
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [useExternalImageUrl, setUseExternalImageUrl] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [activityVisibleMonth, setActivityVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [sheetMonth, setSheetMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('publish-calendar');
  const [trackingDrafts, setTrackingDrafts] = useState<Record<number, TrackingDraft>>({});
  const [rowSaveStatus, setRowSaveStatus] = useState<Record<number, RowSaveStatus>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [activityPendingDelete, setActivityPendingDelete] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [highlightActivityId, setHighlightActivityId] = useState<number | null>(null);
  const [hubRefreshKey, setHubRefreshKey] = useState(0);

  useEffect(() => {
    if (!account) {
      setLoading(false);
      setActivities([]);
      return undefined;
    }

    let active = true;
    setLoading(true);
    fetch('/api/activities', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as { activities?: Activity[]; message?: string };
        if (!response.ok) throw new Error(data.message || '無法讀取活動資料。');
        if (active) setActivities(data.activities ?? []);
      })
      .catch((error: Error) => active && setLoadError(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [account]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/projects', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as { projects?: Array<{ displayName: string }> };
        if (response.ok) {
          setAdminProjectOptions((data.projects ?? []).map((project) => project.displayName));
        }
      })
      .catch(() => {
        // Admin form can still submit without the dropdown.
      });
  }, [isAdmin]);

  useEffect(() => {
    if (account?.role === 'partner') {
      setSelectedYouthProjectName(account.displayName);
    }
  }, [account]);

  const isActivityCalendar = workspaceView === 'activity-calendar';
  const activeCalendarMonth = isActivityCalendar ? activityVisibleMonth : visibleMonth;
  const activeCalendarDateField: 'activityDate' | 'publishDate' = isActivityCalendar ? 'activityDate' : 'publishDate';
  const calendarDays = useMemo(() => buildCalendarDays(activeCalendarMonth), [activeCalendarMonth]);
  const activitiesByDate = useMemo(() => {
    const grouped = new Map<string, Activity[]>();
    activities.forEach((activity) => {
      const dateKey = activity[activeCalendarDateField];
      const dayActivities = grouped.get(dateKey) ?? [];
      dayActivities.push(activity);
      grouped.set(dateKey, dayActivities);
    });
    return grouped;
  }, [activities, activeCalendarDateField]);

  const monthActivities = useMemo(
    () => activities.filter((activity) => {
      const date = parseLocalDate(activity[activeCalendarDateField]);
      return date.getFullYear() === activeCalendarMonth.getFullYear() && date.getMonth() === activeCalendarMonth.getMonth();
    }),
    [activities, activeCalendarDateField, activeCalendarMonth],
  );

  const sheetMonthActivities = useMemo(
    () => activities.filter((activity) => {
      const date = parseLocalDate(activity.publishDate);
      return date.getFullYear() === sheetMonth.getFullYear() && date.getMonth() === sheetMonth.getMonth();
    }),
    [activities, sheetMonth],
  );

  function handleYouthProjectChange(value: string) {
    setSelectedYouthProjectName(value);
  }

  function resetImageUpload() {
    setUploadedImageUrl('');
    setImagePreviewUrl('');
    setUploadStatus({ type: 'idle' });
  }

  async function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadStatus({ type: 'error', message: '請選擇圖片檔案。' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: '圖片大小不可超過 5 MB。' });
      return;
    }

    setUseExternalImageUrl(false);
    setUploadStatus({ type: 'uploading' });
    setImagePreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/uploads', { method: 'POST', body: formData });
      const data = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !data.url) throw new Error(data.message || '圖片上傳失敗。');

      setUploadedImageUrl(data.url);
      setUploadStatus({ type: 'success', message: '圖片已上傳。' });
    } catch (error) {
      setUploadedImageUrl('');
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '圖片上傳失敗。',
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus({ type: 'sending' });
    const form = event.currentTarget;
    const formData = new FormData(form);
    const externalImageUrl = String(formData.get('externalImageUrl') ?? '').trim();
    const imageUrl = useExternalImageUrl ? externalImageUrl : uploadedImageUrl;

    if (!imageUrl) {
      setFormStatus({
        type: 'error',
        message: useExternalImageUrl ? '請貼上圖檔連結。' : '請先上傳圖片，或改用外部連結。',
      });
      return;
    }
    if (uploadStatus.type === 'uploading') {
      setFormStatus({ type: 'error', message: '圖片仍在上傳中，請稍候。' });
      return;
    }

    const payload = {
      sessionNumber: String(formData.get('sessionNumber') ?? ''),
      youthProjectName: account?.role === 'partner'
        ? account.displayName
        : String(formData.get('youthProjectName') ?? ''),
      activityDate: String(formData.get('activityDate') ?? ''),
      publishDate: String(formData.get('publishDate') ?? ''),
      promotionCopy: String(formData.get('promotionCopy') ?? ''),
      imageUrl,
      needsDesign: formData.get('needsDesign') === 'true',
      notes: String(formData.get('notes') ?? ''),
    };

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { activity?: Activity; publicUrl?: string; message?: string };
      if (!response.ok || !data.activity) throw new Error(data.message || '資料送出失敗。');

      setActivities((current) => [...current, data.activity!].sort((a, b) => a.publishDate.localeCompare(b.publishDate)));
      const publishMonth = new Date(parseLocalDate(data.activity.publishDate).getFullYear(), parseLocalDate(data.activity.publishDate).getMonth(), 1, 12);
      const activityMonth = new Date(parseLocalDate(data.activity.activityDate).getFullYear(), parseLocalDate(data.activity.activityDate).getMonth(), 1, 12);
      setVisibleMonth(publishMonth);
      setActivityVisibleMonth(activityMonth);
      setSheetMonth(publishMonth);
      setSelectedActivity(data.activity);
      setHighlightActivityId(data.activity.id);
      setHubRefreshKey((current) => current + 1);
      setFormStatus({
        type: 'success',
        message: `活動已送出。報名連結：${data.publicUrl ?? buildPublicActivityPath(data.activity.slug)}（活動公開後，居民即可在 /活動 看見並報名）`,
      });
      form.reset();
      resetImageUpload();
      setUseExternalImageUrl(false);
    } catch (error) {
      setFormStatus({ type: 'error', message: error instanceof Error ? error.message : '資料送出失敗。' });
    }
  }

  const lockedProjectName = account?.role === 'partner' ? account.displayName : selectedYouthProjectName;

  function moveMonth(offset: number) {
    const setMonth = isActivityCalendar ? setActivityVisibleMonth : setVisibleMonth;
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
    setSelectedActivity(null);
  }

  function returnToCurrentMonth() {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    if (isActivityCalendar) setActivityVisibleMonth(currentMonth);
    else setVisibleMonth(currentMonth);
    setSelectedActivity(null);
  }

  function moveSheetMonth(offset: number) {
    setSheetMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  function returnToCurrentSheetMonth() {
    const now = new Date();
    setSheetMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
  }

  function showCalendar(view: Exclude<WorkspaceView, 'sheet'>) {
    setWorkspaceView(view);
    setSelectedActivity(null);
  }

  function updateTrackingDraft<K extends keyof TrackingDraft>(activity: Activity, field: K, value: TrackingDraft[K]) {
    setTrackingDrafts((current) => ({
      ...current,
      [activity.id]: {
        designStatus: current[activity.id]?.designStatus ?? activity.designStatus,
        publicationStatus: current[activity.id]?.publicationStatus ?? activity.publicationStatus,
        assignee: current[activity.id]?.assignee ?? activity.assignee,
        [field]: value,
      },
    }));
    setRowSaveStatus((current) => {
      const next = { ...current };
      delete next[activity.id];
      return next;
    });
    setRowErrors((current) => {
      const next = { ...current };
      delete next[activity.id];
      return next;
    });
  }

  async function saveActivityTracking(activity: Activity, draft: TrackingDraft) {
    setRowSaveStatus((current) => ({ ...current, [activity.id]: 'saving' }));
    setRowErrors((current) => ({ ...current, [activity.id]: '' }));
    try {
      const response = await fetch('/api/activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activity.id, ...draft }),
      });
      const data = (await response.json()) as { activity?: Activity; message?: string };
      if (!response.ok || !data.activity) throw new Error(data.message || '資料儲存失敗。');

      setActivities((current) => current.map((item) => item.id === activity.id ? data.activity! : item));
      setTrackingDrafts((current) => {
        const next = { ...current };
        delete next[activity.id];
        return next;
      });
      setRowSaveStatus((current) => ({ ...current, [activity.id]: 'saved' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '資料儲存失敗。';
      setRowSaveStatus((current) => ({ ...current, [activity.id]: 'error' }));
      setRowErrors((current) => ({ ...current, [activity.id]: message }));
    }
  }

  function requestActivityDeletion(activity: Activity) {
    setDeleteError('');
    setActivityPendingDelete(activity);
  }

  async function confirmActivityDeletion() {
    if (!activityPendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/activities?id=${activityPendingDelete.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { deleted?: boolean; message?: string };
      if (!response.ok || !data.deleted) throw new Error(data.message || '資料刪除失敗。');

      const deletedId = activityPendingDelete.id;
      setActivities((current) => current.filter((activity) => activity.id !== deletedId));
      setSelectedActivity((current) => current?.id === deletedId ? null : current);
      setTrackingDrafts((current) => {
        const next = { ...current };
        delete next[deletedId];
        return next;
      });
      setRowSaveStatus((current) => {
        const next = { ...current };
        delete next[deletedId];
        return next;
      });
      setRowErrors((current) => {
        const next = { ...current };
        delete next[deletedId];
        return next;
      });
      setActivityPendingDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '資料刪除失敗。');
    } finally {
      setDeleting(false);
    }
  }

  function exportActivitiesCsv() {
    const rows = sheetMonthActivities.map((activity) => [
      activity.sessionNumber,
      activity.youthProjectName,
      activity.activityDate,
      activity.publishDate,
      activity.promotionCopy,
      activity.imageUrl,
      activity.needsDesign ? '是' : '否',
      activity.designStatus,
      activity.publicationStatus,
      activity.assignee,
      activity.slug ? buildPublicActivityPath(activity.slug) : '',
      activity.notes,
      formatCreatedAt(activity.createdAt),
    ]);
    const csv = `\uFEFF${[sheetHeaders, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `青創活動提交資料_${sheetMonth.getFullYear()}-${pad(sheetMonth.getMonth() + 1)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="resources-section" id="resources" aria-labelledby="resources-title">
        <div className="resources-topline">
          <div className="section-kicker"><span>01</span> 資料彙整區</div>
          <a className="notion-source" href="https://app.notion.com/p/38d157616966803eabc0f2cffc9c71ad" target="_blank" rel="noreferrer">檢視原始 Notion 頁面 <span aria-hidden="true">↗</span></a>
        </div>
        <div className="wide-heading">
          <div><h2 id="resources-title">從辦活動到核銷，<br />所需資料一次找齊。</h2></div>
          <p>整合核銷抬頭、核定總表與活動後必留資料。建議於活動前先瀏覽一次，活動結束後再依七項清單逐一確認。</p>
        </div>

        <div className="resource-overview">
          <article className="billing-card">
            <div className="card-label"><span /> 核銷資訊</div>
            <p>核銷抬頭</p>
            <h3>共宅一生股份有限公司</h3>
            <div className="tax-id-row"><span>統一編號</span><strong>52419147</strong></div>
            <a href={resourceShortcuts[0].href} target="_blank" rel="noreferrer">閱讀核銷注意事項 <span aria-hidden="true">↗</span></a>
          </article>

          <div className="shortcut-panel">
            <div className="shortcut-heading"><span>QUICK ACCESS</span><h3>常用入口</h3></div>
            <div className="shortcut-list">
              {resourceShortcuts.map((resource, index) => (
                <a href={resource.href} target="_blank" rel="noreferrer" key={resource.label}>
                  <span className="shortcut-number">0{index + 1}</span>
                  <span className="shortcut-copy"><small>{resource.type}</small><strong>{resource.label}</strong><span>{resource.description}</span></span>
                  <span className="shortcut-arrow" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="checklist-heading">
          <div><span>AFTER THE EVENT</span><h3>社區行動執行提醒</h3><p>活動後必留七件資料</p></div>
          <div className="checklist-count"><strong>07</strong><span>份必備<br />紀錄</span></div>
        </div>

        <div className="post-event-list">
          {postEventChecklist.map((item) => (
            <article className="checklist-item" key={item.number}>
              <span className="checklist-number">{item.number}</span>
              <div className="checklist-copy"><h4>{item.title}</h4><p>{item.description}</p>{item.links.length > 0 && <div className="checklist-links">{item.links.map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.label}>{link.label} <span aria-hidden="true">↗</span></a>)}</div>}</div>
              <span className="checklist-mark" aria-hidden="true">✓</span>
            </article>
          ))}
        </div>
      </section>

      <section className="form-section" id="activity-form" aria-labelledby="form-title">
        <div className="form-intro">
          <div className="section-kicker light"><span>02</span> 內部活動表單</div>
          <h2 id="form-title">填寫活動資訊</h2>
          <p>表單送出後，系統會自動建立報名連結，並同步顯示在活動資料區與工作區月曆。</p>
          <div className="form-tip"><span aria-hidden="true">i</span><p><strong>送出前提醒</strong>可直接上傳圖片（JPG、PNG、WebP、GIF，上限 5 MB），或改用外部連結。</p></div>
        </div>

        <form className="activity-form" onSubmit={handleSubmit}>
          <div className="form-progress"><span>ACTIVITY BRIEF</span><span>01 — 08</span></div>
          <div className="form-grid">
            <label className="field"><span className="field-label-with-link"><span>場次編號 <b>*</b></span><a href="https://docs.google.com/spreadsheets/d/1WuoUipLJK6iEVdCIeOcmdCcbQu_74j7tvu2yD0Xqoso/edit?gid=359503767#gid=359503767" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>第一年核定總表 ↗</a></span><input name="sessionNumber" required maxLength={80} placeholder="例：NJ001A" /></label>
            <label className="field">
              <span>青創名稱 <b>*</b></span>
              {account?.role === 'partner' ? (
                <>
                  <input value={lockedProjectName} readOnly aria-readonly="true" />
                  <input type="hidden" name="youthProjectName" value={lockedProjectName} />
                </>
              ) : (
                <select
                  name="youthProjectName"
                  required
                  value={selectedYouthProjectName}
                  onChange={(event) => handleYouthProjectChange(event.target.value)}
                >
                  <option value="" disabled>請選擇青創計畫</option>
                  {adminProjectOptions.map((project) => (
                    <option value={project} key={project}>{project}</option>
                  ))}
                </select>
              )}
            </label>
            <label className="field"><span>活動日期 <b>*</b></span><input type="date" name="activityDate" required /></label>
            <label className="field"><span>上刊日期 <b>*</b></span><input type="date" name="publishDate" required /></label>
            <label className="field full"><span>宣傳文案 <b>*</b></span><textarea name="promotionCopy" required maxLength={5000} rows={6} placeholder="請貼上完整宣傳訊息，包含活動主題、時間、地點與參與方式…" /></label>
            <div className="field full image-upload-field">
              <span>活動圖檔 <b>*</b></span>
              {!useExternalImageUrl ? (
                <>
                  <div className="file-upload-row">
                    <label className="file-upload-button">
                      {uploadStatus.type === 'uploading' ? '上傳中…' : '選擇圖片'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageFileChange} disabled={uploadStatus.type === 'uploading'} />
                    </label>
                    {uploadedImageUrl && uploadStatus.type === 'success' && (
                      <button className="file-upload-clear" type="button" onClick={resetImageUpload}>清除</button>
                    )}
                  </div>
                  {uploadStatus.type !== 'idle' && uploadStatus.message && (
                    <p className={`file-upload-status ${uploadStatus.type}`}>{uploadStatus.message}</p>
                  )}
                  {imagePreviewUrl && (
                    <img className="file-upload-preview" src={imagePreviewUrl} alt="已選擇的圖片預覽" />
                  )}
                </>
              ) : (
                <div className="input-with-link">
                  <input type="url" name="externalImageUrl" maxLength={1000} placeholder="https://" />
                  <a href="https://reurl.cc/WzadZe" target="_blank" rel="noreferrer">開啟上傳資料夾 ↗</a>
                </div>
              )}
              <button
                className="image-source-toggle"
                type="button"
                onClick={() => {
                  setUseExternalImageUrl((current) => !current);
                  resetImageUpload();
                }}
              >
                {useExternalImageUrl ? '改為直接上傳圖片' : '改用外部連結'}
              </button>
            </div>
            <fieldset className="field full radio-field"><legend>是否需要協助設計圖檔 <b>*</b></legend><div className="radio-options"><label><input type="radio" name="needsDesign" value="true" required /><span>是，需要協助</span></label><label><input type="radio" name="needsDesign" value="false" required /><span>否，已備妥圖檔</span></label></div></fieldset>
            <label className="field full"><span>其他備註 <em>選填</em></span><input name="notes" maxLength={3000} placeholder="其他希望平台組注意的訊息" /></label>
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

      <ActivityHub
        account={account}
        isAdmin={isAdmin}
        highlightActivityId={highlightActivityId}
        refreshToken={hubRefreshKey}
      />

      {account && (
      <section className="workspace-section" id="workspace" aria-labelledby="workspace-title">
        <div className="section-kicker"><span>04</span> 工作區</div>
        <div className="workspace-heading">
          <div><h2 id="workspace-title">月曆與明細，<br />全部放在同一個工作區。</h2><p>分別用上刊月曆與活動月曆掌握排程，或切換到資料表逐條檢視伙伴送出的完整內容。</p></div>
          <div className="workspace-stat"><strong>{workspaceView === 'sheet' ? sheetMonthActivities.length : monthActivities.length}</strong><span>{workspaceView === 'sheet' ? <>{sheetMonth.getMonth() + 1} 月<br />提交筆數</> : isActivityCalendar ? <>{activeCalendarMonth.getMonth() + 1} 月<br />活動場次</> : <>{activeCalendarMonth.getMonth() + 1} 月<br />待上刊場次</>}</span></div>
        </div>

        <div className="workspace-tabbar">
          <div className="workspace-tabs" role="tablist" aria-label="工作區檢視方式">
            <button type="button" role="tab" aria-selected={workspaceView === 'publish-calendar'} aria-controls="calendar-panel" className={workspaceView === 'publish-calendar' ? 'active' : ''} onClick={() => showCalendar('publish-calendar')}><span aria-hidden="true">▦</span> 上刊月曆</button>
            <button type="button" role="tab" aria-selected={workspaceView === 'activity-calendar'} aria-controls="calendar-panel" className={workspaceView === 'activity-calendar' ? 'active' : ''} onClick={() => showCalendar('activity-calendar')}><span aria-hidden="true">▦</span> 活動月曆</button>
            <button type="button" role="tab" aria-selected={workspaceView === 'sheet'} aria-controls="sheet-panel" className={workspaceView === 'sheet' ? 'active' : ''} onClick={() => setWorkspaceView('sheet')}><span aria-hidden="true">≣</span> 活動資料表</button>
          </div>
          {isAdmin && workspaceView === 'sheet' && <button className="csv-button" type="button" onClick={exportActivitiesCsv} disabled={!sheetMonthActivities.length}><span aria-hidden="true">↓</span> 輸出本月 CSV</button>}
        </div>

        {loadError && <div className="calendar-error workspace-error" role="alert">{loadError}</div>}

        {workspaceView !== 'sheet' ? (
          <div className="calendar-shell" id="calendar-panel" role="tabpanel">
            <div className="calendar-toolbar">
              <div><span className="calendar-label">{isActivityCalendar ? 'ACTIVITY CALENDAR' : 'PUBLICATION CALENDAR'}</span><h3>{activeCalendarMonth.getFullYear()} <b>/</b> {pad(activeCalendarMonth.getMonth() + 1)}</h3></div>
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
                  <div className="detail-date"><span>{isActivityCalendar ? '活動' : '上刊'}</span><strong>{formatDate(selectedActivity[activeCalendarDateField])}</strong></div>
                  <div className="detail-main"><span>{selectedActivity.sessionNumber}</span><h4>{selectedActivity.youthProjectName}</h4><p>{selectedActivity.promotionCopy}</p></div>
                  <div className="detail-meta"><span>{isActivityCalendar ? '上刊日期' : '活動日期'} <b>{formatDate(isActivityCalendar ? selectedActivity.publishDate : selectedActivity.activityDate)}</b></span><span>圖檔設計 <b>{selectedActivity.needsDesign ? '需協助' : '已備妥'}</b></span></div>
                  <div className="detail-links"><a href={selectedActivity.imageUrl} target="_blank" rel="noreferrer">圖檔 ↗</a>{selectedActivity.slug && <a href={buildPublicActivityPath(selectedActivity.slug)} target="_blank" rel="noreferrer">報名頁 ↗</a>}</div>
                </>
              ) : (
                <div className="empty-detail">
                  <span aria-hidden="true">{loading ? '…' : '↖'}</span>
                  <p>{loading ? '正在載入活動資料…' : monthActivities.length ? `點選月曆中的活動，查看${isActivityCalendar ? '活動' : '上刊'}摘要。` : `這個月份尚無${isActivityCalendar ? '活動場次' : '上刊項目'}；表單送出後會自動顯示於此。`}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="sheet-shell" id="sheet-panel" role="tabpanel">
            <div className="sheet-toolbar">
              <div><span className="calendar-label">ACTIVITY SUBMISSIONS · 依上刊月份</span><h3>{sheetMonth.getFullYear()} <b>/</b> {pad(sheetMonth.getMonth() + 1)}</h3></div>
              <div className="sheet-toolbar-actions"><span>{loading ? '載入中…' : `本月共 ${sheetMonthActivities.length} 筆`}</span><div className="calendar-controls"><button type="button" onClick={() => moveSheetMonth(-1)} aria-label="上一個月">←</button><button className="today-button" type="button" onClick={returnToCurrentSheetMonth}>今月</button><button type="button" onClick={() => moveSheetMonth(1)} aria-label="下一個月">→</button></div></div>
            </div>
            <div className="sheet-scroll">
              <table className="activity-sheet" aria-busy={loading}>
                <thead>
                  <tr className="sheet-letters"><th className="sheet-corner" aria-label="列號" />{sheetLetters.map((letter) => <th key={letter}>{letter}</th>)}</tr>
                  <tr><th className="row-number">#</th>{sheetDisplayHeaders.map((header) => <th key={header}>{header}</th>)}</tr>
                </thead>
                <tbody>
                  {sheetMonthActivities.length ? sheetMonthActivities.map((activity, index) => {
                    const draft = trackingDrafts[activity.id] ?? {
                      designStatus: activity.designStatus,
                      publicationStatus: activity.publicationStatus,
                      assignee: activity.assignee,
                    };
                    const hasChanges = draft.designStatus !== activity.designStatus || draft.publicationStatus !== activity.publicationStatus || draft.assignee !== activity.assignee;
                    const saveStatus = rowSaveStatus[activity.id];
                    return (
                      <tr key={activity.id}>
                        <th className="row-number" scope="row">{index + 1}</th>
                        <td className="sheet-code">{activity.sessionNumber}</td>
                        <td>{activity.youthProjectName}</td>
                        <td>{activity.activityDate}</td>
                        <td>{activity.publishDate}</td>
                        <td className="sheet-long" title={activity.promotionCopy}>{activity.promotionCopy}</td>
                        <td><a href={activity.imageUrl} target="_blank" rel="noreferrer">開啟圖檔 ↗</a></td>
                        <td>{activity.needsDesign ? '是' : '否'}</td>
                        <td className="sheet-edit-cell">
                          {isAdmin ? (
                            <select aria-label={`${activity.sessionNumber} 設計圖稿接案`} value={draft.designStatus} onChange={(event) => updateTrackingDraft(activity, 'designStatus', event.target.value as DesignStatus)}>{designStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                          ) : activity.designStatus}
                        </td>
                        <td className="sheet-edit-cell">
                          {isAdmin ? (
                            <select aria-label={`${activity.sessionNumber} 發布狀態`} value={draft.publicationStatus} onChange={(event) => updateTrackingDraft(activity, 'publicationStatus', event.target.value as PublicationStatus)}>{publicationStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                          ) : activity.publicationStatus}
                        </td>
                        <td className="sheet-edit-cell">
                          {isAdmin ? (
                            <input aria-label={`${activity.sessionNumber} 人員`} value={draft.assignee} maxLength={120} placeholder="輸入人員" onChange={(event) => updateTrackingDraft(activity, 'assignee', event.target.value)} />
                          ) : (activity.assignee || '—')}
                        </td>
                        <td>{activity.slug ? <a href={buildPublicActivityPath(activity.slug)} target="_blank" rel="noreferrer">公開報名頁 ↗</a> : '—'}</td>
                        <td className="sheet-long" title={activity.notes ?? ''}>{activity.notes || '—'}</td>
                        <td>{formatCreatedAt(activity.createdAt)}</td>
                        <td className="sheet-actions-cell">
                          {isAdmin ? (
                            <div className="row-actions"><button className={`row-save ${saveStatus ?? ''}`} type="button" disabled={!hasChanges || saveStatus === 'saving'} onClick={() => saveActivityTracking(activity, draft)}>{saveStatus === 'saving' ? '儲存中…' : saveStatus === 'saved' && !hasChanges ? '已儲存' : saveStatus === 'error' ? '重試儲存' : '儲存'}</button><button className="row-delete" type="button" onClick={() => requestActivityDeletion(activity)}>刪除</button></div>
                          ) : '—'}
                          {rowErrors[activity.id] && <small className="row-error" title={rowErrors[activity.id]}>{rowErrors[activity.id]}</small>}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td className="sheet-empty" colSpan={15}>{loading ? '正在載入活動資料…' : `${sheetMonth.getFullYear()} 年 ${sheetMonth.getMonth() + 1} 月尚無提交資料。`}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="sheet-footer"><span>{isAdmin ? '修改工作狀態或人員後，請點選該列的「儲存」。' : '此資料表供所有青創瀏覽排程與美編進度。'}</span><span>資料依上刊日期按月顯示</span></div>
          </div>
        )}
      </section>
      )}

      {activityPendingDelete && (
        <div className="confirm-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <span className="confirm-icon" aria-hidden="true">!</span>
            <span className="confirm-kicker">IRREVERSIBLE ACTION</span>
            <h3 id="delete-title">確定要刪除這筆活動？</h3>
            <p id="delete-description">刪除後將<strong>無法復原</strong>，該場次也會從上刊月曆、活動月曆與活動資料表中永久移除。</p>
            <div className="delete-target"><span>{activityPendingDelete.sessionNumber}</span><strong>{activityPendingDelete.youthProjectName}</strong></div>
            {deleteError && <div className="confirm-error" role="alert">{deleteError}</div>}
            <div className="confirm-actions"><button type="button" disabled={deleting} onClick={() => setActivityPendingDelete(null)}>取消</button><button className="confirm-delete" type="button" disabled={deleting} onClick={confirmActivityDeletion}>{deleting ? '刪除中…' : '確定永久刪除'}</button></div>
          </div>
        </div>
      )}

      <footer>
        <div className="footer-brand"><span className="brand-mark" aria-hidden="true">NG</span><div><strong>台北市南港機廠社宅</strong><span>青年創新回饋計畫入口網</span></div></div>
        <p>為青創伙伴打造的資料與協作入口。</p>
        <a href="#top">回到頂端 ↑</a>
      </footer>
    </>
  );
}
