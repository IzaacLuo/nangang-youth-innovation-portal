import PortalSections, { CurrentDateCard } from './components/PortalSections';

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
    description: '提交活動資訊、宣傳文案與圖檔需求，一次完成上刊登記。',
    href: '#activity-form',
    action: '填寫表單',
  },
  {
    number: '03',
    title: '平台組工作區',
    description: '集中查看伙伴提交的活動，依上刊日期與活動日期掌握月曆排程。',
    href: '#workspace',
    action: '開啟工作區',
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="回到首頁">
          <span className="brand-mark" aria-hidden="true">NG</span>
          <span>
            <strong>南港機廠社宅</strong>
            <small>青創入口網</small>
          </span>
        </a>
        <nav aria-label="主要導覽">
          <a href="#resources">資料彙整</a>
          <a href="#activity-form">活動填報</a>
          <a href="#workspace">工作區</a>
        </nav>
        <a className="header-cta" href="#activity-form">提交活動 <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> 南港青創伙伴協作平台</div>
          <h1>讓好點子，<br />在社區裡<span>發生</span>。</h1>
          <p>台北市南港機廠社宅青年創新回饋計畫入口網，整合資料、活動填報與上刊排程，讓每一份回饋都更順利抵達社區。</p>
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
            <p>建議於活動日期前 14 天送出資料，圖檔設計需求也請一併勾選。</p>
          </div>
          <div className="panel-footer"><span>快速入口</span><a href="#workspace">查看上刊月曆 ↗</a></div>
        </div>
      </section>

      <section className="module-section" aria-labelledby="module-title">
        <div className="section-heading">
          <div><span className="eyebrow"><span /> 入口導覽</span><h2 id="module-title">你現在需要做什麼？</h2></div>
          <p>從找資料、送活動，到掌握排程，從這裡開始。</p>
        </div>
        <div className="module-grid">
          {modules.map((module) => (
            <a className="module-card" href={module.href} key={module.number}>
              <span className="module-number">{module.number}</span>
              <div className="module-icon" aria-hidden="true">{module.number === '01' ? '≣' : module.number === '02' ? '✐' : '▦'}</div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <span className="module-link">{module.action} <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
      </section>

      <PortalSections />
    </main>
  );
}
