'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

const ADMIN_EMAILS = ['tadeomunozgarces@gmail.com', 'milenapabraham@gmail.com'];

const DEFAULT_LOGS = [
  {
    id: 'log-demo-1',
    type: 'analysis_success',
    filename: 'ventas_retail_2026.csv',
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 12) },
    target: 'ventas',
    user_email: 'tadeomunozgarces@gmail.com',
    metrics: {
      forecast: { mae: 142.5, mape: 3.8 },
      anomalies: { n_anomalias: 4, pct_anomalias: 2.1 },
      feature_importance: { n_features: 8 },
      segmentation: { clusters: 3 },
    },
  },
  {
    id: 'log-demo-2',
    type: 'auth_google',
    user_email: 'milenapabraham@gmail.com',
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 45) },
    ip: '127.0.0.1',
    device: 'MacBook Pro / Chrome',
  },
  {
    id: 'log-demo-3',
    type: 'chat_query',
    user_email: 'tadeomunozgarces@gmail.com',
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 75) },
    query: '¿Cuáles son las variables con mayor correlación negativa?',
  },
  {
    id: 'log-demo-4',
    type: 'analysis_success',
    filename: 'demanda_cadena_frio.xlsx',
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 180) },
    target: 'unidades',
    user_email: 'tadeomunozgarces@gmail.com',
    metrics: {
      forecast: { mae: 48.2, mape: 2.9 },
      anomalies: { n_anomalias: 7, pct_anomalias: 3.5 },
      feature_importance: { n_features: 12 },
      segmentation: { clusters: 4 },
    },
  },
  {
    id: 'log-demo-5',
    type: 'auth_session_start',
    user_email: 'tadeomunozgarces@gmail.com',
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 240) },
    ip: '127.0.0.1',
  },
];

export function useAdminState() {
  const [authorized, setAuthorized] = useState<boolean | null>(true);
  const [logs, setLogs] = useState<any[]>(DEFAULT_LOGS);
  const [cleaning, setCleaning] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      setAuthorized(true);
    }

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted && !isLocalhost) setAuthorized(false);
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        const isAdminClaim = token.claims.admin === true;
        const userEmail = (user.email || '').toLowerCase().trim();
        const isAdminEmail = ADMIN_EMAILS.includes(userEmail);
        if (isMounted) setAuthorized(isAdminClaim || isAdminEmail || isLocalhost);
      } catch {
        const userEmail = (user.email || '').toLowerCase().trim();
        const isAdminEmail = ADMIN_EMAILS.includes(userEmail);
        if (isMounted) setAuthorized(isAdminEmail || isLocalhost);
      }
    });

    return () => {
      isMounted = false;
      unsubAuth();
    };
  }, []);


  useEffect(() => {
    if (!authorized) return;

    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(300));
    const unsubLogs = onSnapshot(
      q,
      (snapshot) => {
        const newLogs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setLogs(newLogs);
      },
      (error) => {
        console.error('Error fetching logs:', error);
        toast.error('Error al leer logs. Verificá las reglas de Firestore.');
      }
    );

    return () => unsubLogs();
  }, [authorized]);

  const cleanOldLogs = async () => {
    if (!confirm('¿Seguro que querés borrar los logs de más de 30 días?')) return;
    setCleaning(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const q = query(collection(db, 'system_logs'), where('timestamp', '<', thirtyDaysAgo), limit(500));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast.success('No hay logs antiguos para borrar.');
        return;
      }
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast.success(`Se borraron ${snapshot.size} logs antiguos.`);
    } catch (err: any) {
      if (err.message.includes('failed-precondition')) {
        const urlMatch = err.message.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        if (urlMatch) {
          toast(
            (t) => (
              <div className="flex flex-col gap-2">
                <span className="font-bold text-sm">Falta crear índice Firestore</span>
                <a
                  href={urlMatch[1]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 underline break-all"
                >
                  Click acá para crearlo
                </a>
              </div>
            ),
            { duration: 10000 }
          );
        }
      }
    } finally {
      setCleaning(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterType !== 'all' && !log.type.includes(filterType)) return false;
      if (search && !JSON.stringify(log).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filterType, search]);

  const stats = useMemo(() => {
    let u = 0,
      a = 0,
      e = 0,
      c = 0;
    logs.forEach((log) => {
      if (log.type.includes('auth_')) u++;
      if (log.type === 'analysis_success') a++;
      if (log.type === 'analysis_error') e++;
      if (log.type === 'chat_session_started') c++;
    });
    return { users: u, analyses: a, errors: e, chats: c };
  }, [logs]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = { Auth: 0, Análisis: 0, Errores: 0, Asistente: 0 };
    logs.forEach((log) => {
      if (log.type.includes('auth_')) counts['Auth']++;
      else if (log.type === 'analysis_success') counts['Análisis']++;
      else if (log.type.includes('error')) counts['Errores']++;
      else if (log.type.includes('chat')) counts['Asistente']++;
    });

    return {
      labels: Object.keys(counts),
      datasets: [
        {
          label: 'Eventos (Últimos 300)',
          data: Object.values(counts),
          backgroundColor: ['#bdf559', '#815ae1', '#ef4444', '#3b82f6'],
          borderColor: '#111',
          borderWidth: 2,
        },
      ],
    };
  }, [logs]);

  return {
    authorized,
    logs,
    cleaning,
    filterType,
    setFilterType,
    search,
    setSearch,
    cleanOldLogs,
    filteredLogs,
    stats,
    chartData,
  };
}
