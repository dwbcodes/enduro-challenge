'use client';

import { Suspense, ReactNode } from 'react';
import { EventProvider } from '@/context';
import SharedHeader from '@/components/SharedHeader';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <EventProvider>
        <SharedHeader />
        {children}
      </EventProvider>
    </Suspense>
  );
}
