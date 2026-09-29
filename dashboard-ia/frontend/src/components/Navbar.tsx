'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Layers, Activity, Sparkles, LogIn } from 'lucide-react';
import UserNavDropdown from '@/components/UserNavDropdown';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav
      aria-label="Navegación principal"
      className="w-full sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-[#07070a]/90 border-b border-black/[0.08] dark:border-white/[0.08] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-[#7647eb] focus-visible:outline-none"
          >
            <div className="w-8 h-8 flex items-center justify-center font-mono font-bold text-sm rounded-lg bg-zinc-950 dark:bg-gradient-to-br dark:from-[#7647eb] dark:to-[#5b24c6] text-white shadow-sm transition-transform group-hover:scale-105">
              M
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-xl tracking-tight text-zinc-950 dark:text-white">
                MIO
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user && (
            <div className="flex items-center gap-2.5 sm:gap-3">
              {['tadeomunozgarces@gmail.com', 'milenapabraham@gmail.com'].includes(user.email || '') && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all bg-[#bdf559]/20 text-zinc-950 dark:text-[#bdf559] border border-[#bdf559]/40 hover:bg-[#bdf559]/30 shadow-sm"
                  title="Panel de Telemetría FastAPI"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-[#7647eb] dark:text-[#a78bfa]" />
                <span>Mis Proyectos</span>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2.5 sm:gap-3">
            {user ? (
              <UserNavDropdown user={user} />
            ) : (
              <div className="flex items-center gap-2.5">
                <UserNavDropdown user={null} />
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar sesión</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-bold transition-all bg-[#7647eb] hover:bg-[#602cd1] text-white shadow-md active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#bdf559]" />
                  <span>Espacio de Trabajo</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
