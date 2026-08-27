import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '台北市南港機廠社宅青年創新回饋計畫入口網',
  description: '南港機廠社宅青創伙伴的資料彙整、活動填報與上刊排程工作平台。',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: '南港機廠社宅 青創入口網',
    description: '讓好點子，在社區裡發生。整合資料、活動填報與上刊排程的協作入口。',
    type: 'website',
    locale: 'zh_TW',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '南港機廠社宅青創入口網' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '南港機廠社宅 青創入口網',
    description: '讓好點子，在社區裡發生。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
