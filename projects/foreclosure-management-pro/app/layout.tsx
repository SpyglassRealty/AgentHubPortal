import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Foreclosure Pro - Property Management System',
  description: 'Spyglass Realty Foreclosure Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="bg-gray-900 min-h-screen">
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="main-content flex-1">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
