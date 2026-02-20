import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Report Dashboard',
  description: 'Issue reports and track status',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950 text-slate-100">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}