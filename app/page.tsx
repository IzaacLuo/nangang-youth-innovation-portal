'use client';

import { useEffect, useState } from 'react';

import SiteHeader from './components/SiteHeader';
import PortalSections, { CurrentDateCard } from './components/PortalSections';
import { fetchCurrentAccount, type PublicAccount } from './lib/client-auth';

const modules = [
  {
    number: '01',
    title: '資料彙整區',
    description: '執行青創計畫所需的資料懶人包、範本與常用連結。',
    href: '#resources',
    action: '查看資料',
  },
  {
    number: '02',
    title: '內部活動表單',
    description: '提交活動資訊、宣傳文案與圖檔需求，建立後自動產生報名連結。',
    href: '#activity-form',
    action: '填寫表單',
  },
  {
    number: '03',
    title: '活動資料區',
    description: '查看我的活動、複製公開報名連結，並管理報名名單。',
    href: '#activity-hub',
    action: '查看活動',
  },
  {
    number: '04',
    title: '工作區',
    description: '瀏覽上刊月曆、活動月曆與完整資料表，掌握美編與排程進度。',
    href: '#workspace',
    action: '開啟工作區',
  },
];

export default function HomePage() {
  const [account, setAccount] = useState<PublicAccount | null>(null);

  useEffect(() => {
    fetchCurrentAccount().then(setAccount).catch(() => setAccount(null));
  }, []);

  return (
    <main>
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> 南港青創伙伴協作平台</div>
          <h1>讓好點子，<br />在社區裡<span>發生</span>。</h1>
          <p>台北市南港機廠社宅青年創新回饋計畫入口網，整合資料、活動填報、報名管理與上刊排程，讓每一份回饋都更順利抵達社區。</p>
          <div className="hero-actions">
            <a className="primary-button" href="#activity-form">開始填報 <span aria-hidden="true">→</span></a>
            <a className="text-button" href="#resources">先看資料懶人包</a>
          </div>
        </div>

        <div className="hero-panel" aria-label="今月重點">
          <div className="panel-topline"><span>今月工作提示</span><span className="live-dot">進行中</span></div>
          <CurrentDateCard />
          <div className="panel-copy">
            <span className="kicker">活動上刊提醒</span>
            <h2>提早完成填報，<br />讓宣傳不趕場。</h2>
            <p>建議於活動日期前 14 天送出資料，圖檔設計需求也請一併勾選。居民可在公開入口 <a href="/活動" target="_blank" rel="noreferrer">/活動</a> 瀏覽已公開場次。</p>
          </div>
          <div className="panel-footer"><span>快速入口</span><a href="#activity-hub">查看我的活動 ↗</a></div>
        </div>
      </section>

      <section className="module-section" aria-labelledby="module-title">
        <div className="section-heading">
          <div><span className="eyebrow"><span /> 入口導覽</span><h2 id="module-title">你現在需要做什麼？</h2></div>
          <p>從找資料、送活動，到掌握排程，從這裡開始。</p>
        </div>
        <div className={`module-grid module-grid-${modules.length}`}>
          {modules.map((module) => (
            <a className="module-card" href={module.href} key={module.number}>
              <span className="module-number">{module.number}</span>
              <div className="module-icon" aria-hidden="true">{module.number === '01' ? '≣' : module.number === '02' ? '✐' : module.number === '03' ? '◎' : '▦'}</div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <span className="module-link">{module.action} <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
      </section>

      <PortalSections isAdmin={account?.role === 'admin'} account={account} />
    </main>
  );
}
