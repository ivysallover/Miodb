'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  UserCircle,
  Settings,
  Eye,
  Volume2,
  VolumeX,
  Cookie,
  FileText,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserNavDropdownProps {
  user: User | null;
}

export default function UserNavDropdown({ user }: UserNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [colorblindMode, setColorblindMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load initial preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCb = localStorage.getItem('mio_colorblind_mode') === 'true';
      setColorblindMode(savedCb);
      if (savedCb) {
        document.documentElement.classList.add('colorblind-mode');
      }

      const savedSound = localStorage.getItem('mio_sound_enabled');
      setSoundEnabled(savedSound !== 'false');

      const handleCbChange = (e: any) => {
        setColorblindMode(Boolean(e.detail?.enabled));
      };
      window.addEventListener('mio:colorblind-changed', handleCbChange);
      return () => window.removeEventListener('mio:colorblind-changed', handleCbChange);
    }
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleColorblind = (checked: boolean) => {
    setColorblindMode(checked);
    try {
      localStorage.setItem('mio_colorblind_mode', String(checked));
      if (checked) {
        document.documentElement.classList.add('colorblind-mode');
        toast.success('Modo Daltonismo y Alto Contraste Activado', { icon: '👁️' });
      } else {
        document.documentElement.classList.remove('colorblind-mode');
        toast.success('Modo Normal Restaurado', { icon: '🎨' });
      }
      window.dispatchEvent(new CustomEvent('mio:colorblind-changed', { detail: { enabled: checked } }));
    } catch (e) {
      console.warn('Error saving colorblind mode:', e);
    }
  };

  const toggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    try {
      localStorage.setItem('mio_sound_enabled', String(checked));
      toast.success(checked ? 'Efectos de sonido activados' : 'Efectos de sonido silenciados');
      window.dispatchEvent(new CustomEvent('mio:sound-toggle', { detail: { enabled: checked } }));
    } catch (e) {
      console.warn('Error saving sound preference:', e);
    }
  };

  const handleOpenCookiePreferences = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mio:open-cookie-preferences'));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
      toast.success('Sesión cerrada correctamente');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cerrar sesión');
    }
  };

  const username = user?.email ? user.email.split('@')[0] : 'Invitado';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      {user ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`Menú de usuario y configuración de ${user.email}`}
          className={`flex items-center gap-2 text-sm text-gray-900 bg-white hover:bg-gray-50 px-3 py-1.5 border border-black/15 hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none ${
            isOpen ? 'bg-mio-lime/20 border-mio-violet' : ''
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-mio-lime border border-black/15 flex items-center justify-center text-xs font-black text-gray-950 uppercase">
            {username.charAt(0)}
          </div>
          <span className="font-bold text-xs sm:text-sm max-w-[130px] truncate">{username}</span>
          <Settings className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-90 text-mio-violet' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Abrir menú de configuración y accesibilidad"
          className={`flex items-center gap-1.5 p-2 bg-white hover:bg-gray-50 border border-black/15 hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none ${
            isOpen ? 'bg-mio-lime/30' : ''
          }`}
          title="Configuración y accesibilidad"
        >
          <Settings className={`w-4 h-4 text-gray-800 transition-transform duration-200 ${isOpen ? 'rotate-90 text-mio-violet' : ''}`} />
          <span className="sr-only">Configuración y Preferencias</span>
        </button>
      )}

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Opciones de cuenta y preferencias"
          className="absolute right-0 mt-2 w-80 sm:w-88 bg-white border-4 border-black/15 z-50 p-4 text-gray-900 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* 1. Header con Información de Usuario */}
          <div className="border-b-2 border-black/15 pb-3 mb-3 bg-[#f3f3f5] p-3 border border-gray-200">
            {user ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                    Cuenta Conectada
                  </span>
                  <span className="px-2 py-0.5 bg-mio-lime border border-black/15 text-[10px] font-mono font-black uppercase">
                    Verificado
                  </span>
                </div>
                <p className="font-black text-sm text-gray-950 truncate tracking-tight">{username}</p>
                <p className="text-xs text-gray-600 font-mono truncate">{user.email}</p>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Modo Invitado / Demo
                </span>
                <p className="text-xs text-gray-700 font-medium mb-2">
                  Iniciá sesión para guardar tus análisis y acceder a todas las funciones.
                </p>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block text-center py-1.5 bg-mio-lime text-gray-950 font-black text-xs uppercase border border-black/15 hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                >
                  Iniciar sesión o Registrarte
                </Link>
              </div>
            )}
          </div>

          {/* 2. Sección: Accesibilidad y Visión (Modo Daltonismo) */}
          <div className="mb-4 space-y-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
              Accesibilidad Visual
            </span>

            {/* Switch Modo Daltonismo */}
            <div className="flex items-start justify-between gap-3 p-2.5 bg-gray-50 border border-black/15">
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-mio-violet shrink-0 mt-0.5" />
                <div>
                  <label htmlFor="toggle-colorblind" className="text-xs font-black text-gray-950 uppercase cursor-pointer block leading-tight">
                    Modo Daltonismo
                  </label>
                  <span className="text-[11px] text-gray-600 leading-tight block mt-0.5 font-medium">
                    Paleta Okabe-Ito, tramas y contraste alto (Protan/Deutan/Tritan).
                  </span>
                </div>
              </div>
              <input
                id="toggle-colorblind"
                type="checkbox"
                checked={colorblindMode}
                onChange={(e) => toggleColorblind(e.target.checked)}
                className="w-5 h-5 accent-mio-violet cursor-pointer shrink-0 mt-0.5"
                aria-label="Activar o desactivar modo daltonismo y alto contraste"
              />
            </div>
          </div>

          {/* 3. Sección: Preferencias del Sistema */}
          <div className="mb-4 space-y-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
              Preferencias del Sistema
            </span>

            {/* Efectos de Audio */}
            <div className="flex items-center justify-between p-2.5 bg-white border border-black/15">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-gray-800" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs font-bold text-gray-900">Efectos de Sonido WebAudio</span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => toggleSound(e.target.checked)}
                className="w-4 h-4 accent-mio-violet cursor-pointer"
                aria-label="Activar o desactivar efectos de audio sintético"
              />
            </div>

            {/* Cookies y Privacidad */}
            <button
              type="button"
              onClick={handleOpenCookiePreferences}
              className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-gray-50 border border-black/15 text-left transition-colors text-xs font-bold text-gray-900"
            >
              <div className="flex items-center gap-2">
                <Cookie className="w-4 h-4 text-mio-violet" />
                <span>Gestor de Cookies y Privacidad</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-500" />
            </button>
          </div>

          {/* 4. Enlaces de Navegación Rápida */}
          <div className="border-t-2 border-gray-200 pt-3 mb-3 space-y-1 text-xs font-bold">
            {user && (
              <Link
                href="/projects"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 py-1.5 px-2 hover:bg-mio-lime/20 text-gray-800 hover:text-black transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-mio-violet" />
                <span>Mis Proyectos Guardados</span>
              </Link>
            )}
            <Link
              href="/privacidad"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-mio-lime/20 text-gray-800 hover:text-black transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gray-600" />
              <span>Política de Privacidad</span>
            </Link>
            <Link
              href="/terminos"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-mio-lime/20 text-gray-800 hover:text-black transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-gray-600" />
              <span>Términos y Condiciones</span>
            </Link>
          </div>

          {/* 5. Cerrar Sesión (Salir de la cuenta) */}
          {user && (
            <div className="border-t-2 border-black/15 pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs uppercase border border-red-500 hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir de la cuenta</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
