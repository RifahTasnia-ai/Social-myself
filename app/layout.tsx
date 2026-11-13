import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kotonoha Studio — Personal Keyword & Feed Workspace',
  description:
    'A serene anime-inspired personal keyword workspace, live feed, and verification dialogue studio.',
  openGraph: {
    title: 'Kotonoha Studio — Personal Keyword & Feed Workspace',
    description:
      'A serene anime-inspired personal keyword workspace, live feed, and verification dialogue studio.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kotonoha Studio — Personal Keyword & Feed Workspace',
    description:
      'A serene anime-inspired personal keyword workspace, live feed, and verification dialogue studio.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${cormorant.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F6F3EC] text-[#1A1D24] font-sans antialiased selection:bg-[#2D4B73]/15 selection:text-[#1A1D24]"
      >
        {children}
      </body>
    </html>
  );
}
