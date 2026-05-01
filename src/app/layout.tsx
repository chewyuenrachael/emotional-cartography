import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

const description =
  'A corpus of 102 vlogs. Seven cities. Three years of one voice. Can a voice alone tell you how the speaker felt? An interactive study in emotion clustering.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Emotional Cartography | Rach Chew',
  description,
  keywords: [
    'machine learning',
    'emotion recognition',
    'audio analysis',
    'clustering',
    'data visualization',
    'portfolio',
  ],
  authors: [{ name: 'Rach Chew' }],
  openGraph: {
    title: 'Emotional Cartography',
    description,
    siteName: 'Emotional Cartography',
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emotional Cartography',
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#0a0a0f] text-white antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
