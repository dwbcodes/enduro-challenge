'use client';

import { useState, useCallback, useEffect } from 'react';

const STARRED_KEY = 'enduro_starred';
const REGISTERED_KEY = 'enduro_registered';

function readSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function useChallengePrefs() {
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [registered, setRegistered] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStarred(readSet(STARRED_KEY));
    setRegistered(readSet(REGISTERED_KEY));
  }, []);

  const toggleStar = useCallback((id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeSet(STARRED_KEY, next);
      return next;
    });
  }, []);

  const addRegistered = useCallback((id: string) => {
    setRegistered((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      writeSet(REGISTERED_KEY, next);
      return next;
    });
  }, []);

  const removeRegistered = useCallback((id: string) => {
    setRegistered((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      writeSet(REGISTERED_KEY, next);
      return next;
    });
  }, []);

  const isStarred = useCallback((id: string) => starred.has(id), [starred]);
  const isRegistered = useCallback((id: string) => registered.has(id), [registered]);

  return { starred, registered, toggleStar, addRegistered, removeRegistered, isStarred, isRegistered };
}
