'use client';

import { motion } from 'framer-motion';
import {
  Library,
  BarChart3,
  Settings,
  FolderTree,
} from 'lucide-react';
import { useAppStore, type ViewType } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { getDueExercises } from '@/lib/db';

const navItems: { id: ViewType; label: string; icon: typeof Library }[] = [
  { id: 'library', label: 'Biblio', icon: Library },
  { id: 'manage', label: 'Orga', icon: FolderTree },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Réglages', icon: Settings },
];

export function MobileNav() {
  const { currentView, setCurrentView, subjects } = useAppStore();
  const [dueCount, setDueCount] = useState(0);

  const loadDue = useCallback(async () => {
    try {
      const due = await getDueExercises();
      setDueCount(due.length);
    } catch (e) {
      console.error('Error loading due count:', e);
    }
  }, []);

  useEffect(() => {
    loadDue();
    const interval = setInterval(loadDue, 30000);
    return () => clearInterval(interval);
  }, [subjects, loadDue]);

  useEffect(() => {
    if (currentView === 'library') loadDue();
  }, [currentView, loadDue]);

  // Hide during review
  if (currentView === 'review') return null;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-zinc-800 safe-area-bottom"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentView(item.id)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all relative min-w-[60px]',
              currentView === item.id
                ? 'text-cyan-400'
                : 'text-zinc-500'
            )}
          >
            {/* Active indicator dot */}
            {currentView === item.id && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute -top-1 w-1 h-1 rounded-full bg-cyan-400"
              />
            )}
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>

            {/* Due badge */}
            {item.id === 'library' && dueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">
                {dueCount > 99 ? '99+' : dueCount}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
}
