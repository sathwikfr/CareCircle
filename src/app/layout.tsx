import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CareCircle — Stay close, even from far away',
  description: 'A daily phone call for your parents, in their language. Saathi checks on medicines and wellbeing, and you see every call on your CareCircle dashboard.',
  keywords: ['carecircle', 'elder care', 'ai voice companion', 'parents check-in', 'medication reminder', 'india elder care']
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f4ec' },
    { media: '(prefers-color-scheme: dark)', color: '#121615' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
