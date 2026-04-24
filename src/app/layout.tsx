import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Emotional Cartography | Rach Chew',
  description:
    'I recorded vlogs across seven cities and four continents over three years. Then I asked: can a machine understand how I felt? An interactive exploration of emotion recognition via audio clustering.',
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
    description:
      'Can a machine understand how I felt? An interactive ML journey.',
    type: 'website',
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
