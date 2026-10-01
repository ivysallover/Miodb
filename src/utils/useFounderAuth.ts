/**
 * src/utils/useFounderAuth.ts
 * Hook de autorización para áreas exclusivas de administración y testing de fundadores:
 * Tadeo Muñoz Garcés & Milena Abraham.
 */

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const ADMIN_EMAILS = [
  'tadeomunozgarces@gmail.com',
  'milenapabraham@gmail.com',
];

export function useFounderAuth() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      if (isLocal) return true;
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthorized(isLocal ? true : false);
        }
        return;
      }

      if (isMounted) setCurrentUser(user);
      const email = (user.email || '').toLowerCase().trim();
      const isAdminEmail = ADMIN_EMAILS.includes(email);

      try {
        const token = await user.getIdTokenResult();
        const isAdminClaim = token.claims.admin === true;
        if (isMounted) {
          setIsAuthorized(isAdminClaim || isAdminEmail || isLocal);
        }
      } catch {
        if (isMounted) {
          setIsAuthorized(isAdminEmail || isLocal);
        }
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  return { isAuthorized, currentUser };
}
