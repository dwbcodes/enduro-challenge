import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from './ClientProviders';

export const metadata: Metadata = {
  title: 'Fitness Challenge',
  description: 'Create and join Strava-based fitness challenges. Track your times on segments, climb the leaderboard, and compete across categories.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
