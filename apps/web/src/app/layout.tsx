import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from './ClientProviders';

export const metadata: Metadata = {
  title: 'Santa Monica Mountains Enduro Challenge',
  description: 'Compete on the iconic trails of the Santa Monica Mountains. Track your times on Strava segments, climb the leaderboard across MTB, eBike, and age categories.',
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
