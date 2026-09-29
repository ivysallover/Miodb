'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function useProjectsState() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setUser(u);
      loadProjects(u.uid);
    });
    return () => unsub();
  }, [router]);

  const loadProjects = async (uid: string) => {
    try {
      const q = query(collection(db, 'users', uid, 'analyses'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProjects(docs);
    } catch (e) {
      console.warn('Error cargando proyectos:', e);
      toast.error('No se pudieron cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'analyses', id));
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Proyecto eliminado.');
    } catch (e) {
      toast.error('No se pudo eliminar el proyecto.');
    }
  };

  return {
    user,
    projects,
    loading,
    handleDelete,
    router,
  };
}
