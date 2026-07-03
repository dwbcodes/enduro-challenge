'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getChallenges, ChallengeInfo } from '@/lib/api';

const STORAGE_KEY = 'enduro_challengeId';

interface EventContextValue {
  challengeId: string | null;
  challengeName: string | null;
  challenge: ChallengeInfo | null;
  challenges: ChallengeInfo[];
  selectEvent: (id: string) => void;
  loading: boolean;
}

const EventContext = createContext<EventContextValue>({
  challengeId: null,
  challengeName: null,
  challenge: null,
  challenges: [],
  selectEvent: () => {},
  loading: true,
});

export function useEvent() {
  return useContext(EventContext);
}

export function EventProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChallenges()
      .then((data) => {
        const all = [...data.active, ...data.upcoming, ...data.past];
        setChallenges(all);

        // Resolve initial challengeId: URL param > localStorage > first active
        const urlId = searchParams.get('challengeId');
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        const candidate = urlId ?? storedId;

        if (candidate && all.some((c) => c.id === candidate)) {
          setChallengeId(candidate);
          if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, candidate);
        } else if (data.active.length > 0) {
          setChallengeId(data.active[0].id);
          if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, data.active[0].id);
        } else {
          // Clear stale value
          if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // searchParams intentionally read once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectEvent = useCallback(
    (id: string) => {
      setChallengeId(id);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
      // Update URL param without full navigation
      const params = new URLSearchParams(searchParams.toString());
      params.set('challengeId', id);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const challenge = challenges.find((c) => c.id === challengeId) ?? null;

  return (
    <EventContext.Provider
      value={{
        challengeId,
        challengeName: challenge?.name ?? null,
        challenge,
        challenges,
        selectEvent,
        loading,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}
