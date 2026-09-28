import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lo-lyfe | Find what you qualify for',
  description: 'Explore opportunities with clear eligibility requirements. Demo catalog only.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
