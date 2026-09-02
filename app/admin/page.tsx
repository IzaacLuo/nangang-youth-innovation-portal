'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { fetchCurrentAccount, type PublicAccount } from '../lib/client-auth';

type ProjectRow = PublicAccount & {
  codeWithMemberName: string;
};

type DraftRow = {
  code: string;
  role: 'partner' | 'admin';
  memberName: string;
  projectName: string;
  displayName: string;
};

const emptyDraft = (): DraftRow => ({
  code: '',
  role: 'partner',
  memberName: '',
  projectName: '',
  displayName: '',
});

export default function AdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [draft, setDraft] = useState<DraftRow>(emptyDraft());
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadProjects() {
    const response = await fetch('/api/admin/projects', { cache: 'no-store' });
    const data = (await response.json()) as { projects?: ProjectRow[]; message?: string };
    if (!response.ok) throw new Error(data.message || '無法讀取帳號清單。');
    setProjects(data.projects ?? []);
  }

  useEffect(() => {
    let active = true;
    fetchCurrentAccount()
      .then((current) => {
        if (!active) return;
        if (!current || current.role !== 'admin') {
          router.replace('/');
          return;
        }
        setAccount(current);
        return loadProjects();
      })
      .catch(() => active && router.replace('/'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [router]);

  function startCreate() {
    setEditingCode(null);
    setDraft(emptyDraft());
    setMessage('');
    setError('');
  }

  function startEdit(project: ProjectRow) {
    setEditingCode(project.code);
    setDraft({
      code: project.code,
      role: project.role,
      memberName: project.memberName,
      projectName: project.projectName,
      displayName: project.displayName,
    });
    setMessage('');
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/projects', {
        method: editingCode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || '儲存失敗。');
      await loadProjects();
      setMessage(editingCode ? '帳號已更新。' : '帳號已新增。');
      if (!editingCode) {
        setDraft(emptyDraft());
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '儲存失敗。');
    }
  }

  async function handleDelete(code: string) {
    if (!window.confirm(`確定要刪除 ${code}？`)) return;
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/projects?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || '刪除失敗。');
      await loadProjects();
      setMessage(`${code} 已刪除。`);
      if (editingCode === code) startCreate();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '刪除失敗。');
    }
  }

  async function handleResetPassword(code: string) {
    if (!window.confirm(`確定要將 ${code} 的密碼重設為預設值？`)) return;
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/projects/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || '重設密碼失敗。');
      setMessage(data.message || '密碼已重設。');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : '重設密碼失敗。');
    }
  }

  if (loading) {
    return <main className="admin-page"><p>載入中…</p></main>;
  }

  if (!account) return null;

  return (
    <main className="admin-page">
      <div className="admin-topbar">
        <div>
          <span className="section-kicker"><span>ADMIN</span> 帳號管理</span>
          <h1>青創帳號後台</h1>
          <p>管理組別編號、提案名稱與顯示名稱，並可重設密碼。</p>
        </div>
        <div className="admin-topbar-actions">
          <Link className="text-button" href="/">回到首頁</Link>
          <button className="primary-button" type="button" onClick={startCreate}>新增帳號</button>
        </div>
      </div>

      {(message || error) && (
        <div className={`form-message ${error ? 'error' : 'success'}`} role="status">
          {error || message}
        </div>
      )}

      <section className="admin-form-panel">
        <h2>{editingCode ? `編輯 ${editingCode}` : '新增帳號'}</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>組別編號</span>
            <input
              required
              value={draft.code}
              disabled={Boolean(editingCode)}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
            />
          </label>
          <label className="field">
            <span>角色</span>
            <select
              value={draft.role}
              onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as DraftRow['role'] }))}
            >
              <option value="partner">青創伙伴</option>
              <option value="admin">管理員</option>
            </select>
          </label>
          <label className="field">
            <span>姓名</span>
            <input value={draft.memberName} onChange={(event) => setDraft((current) => ({ ...current, memberName: event.target.value }))} />
          </label>
          <label className="field">
            <span>提案名稱</span>
            <input required value={draft.projectName} onChange={(event) => setDraft((current) => ({ ...current, projectName: event.target.value }))} />
          </label>
          <label className="field full">
            <span>編號加提案名稱（顯示名稱）</span>
            <input required value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
          </label>
          <button className="primary-button" type="submit">{editingCode ? '儲存變更' : '建立帳號'}</button>
        </form>
      </section>

      <section className="admin-table-panel">
        <div className="sheet-scroll">
          <table className="activity-sheet admin-table">
            <thead>
              <tr>
                <th>組別編號</th>
                <th>提案名稱</th>
                <th>編號加姓名</th>
                <th>編號加提案名稱</th>
                <th>角色</th>
                <th>需改密碼</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.code}>
                  <td>{project.code}</td>
                  <td>{project.projectName}</td>
                  <td>{project.codeWithMemberName}</td>
                  <td>{project.displayName}</td>
                  <td>{project.role === 'admin' ? '管理員' : '青創'}</td>
                  <td>{project.mustChangePassword ? '是' : '否'}</td>
                  <td className="sheet-actions-cell">
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(project)}>編輯</button>
                      <button type="button" onClick={() => handleResetPassword(project.code)}>重設密碼</button>
                      {project.code !== 'ADMIN' && (
                        <button className="row-delete" type="button" onClick={() => handleDelete(project.code)}>刪除</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
