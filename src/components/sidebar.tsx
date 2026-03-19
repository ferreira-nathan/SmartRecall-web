/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { motion } from 'framer-motion';
import { 
  Library, 
  BarChart3, 
  Settings, 
  FolderTree,
  BookOpen,
  Zap,
  Target,
  Flame
} from 'lucide-react';
import { useAppStore, type ViewType } from '@/lib/store';
import type { ExamMode } from '@/lib/spaced-repetition';
import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { getDueExercises, getFullStats, getReviewStats } from '@/lib/db';

const navItems: { id: ViewType; label: string; icon: typeof Library }[] = [
  { id: 'library', label: 'Bibliothèque', icon: Library },
  { id: 'manage', label: 'Organisation', icon: FolderTree },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

const examModeOptions: { id: ExamMode; label: string; description: string; icon: typeof Zap }[] = [
  { id: '1day', label: '1 jour', description: 'Intensif', icon: Zap },
  { id: '1week', label: '1 semaine', description: 'Modéré', icon: Target },
  { id: '1month', label: '1 mois', description: 'Normal', icon: BookOpen },
];

function calculateStreak(stats: { date: Date }[]): number {
  if (stats.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = today;

  const sortedStats = [...stats].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const todayStat = sortedStats.find(s => {
    const statDate = new Date(s.date);
    statDate.setHours(0, 0, 0, 0);
    return statDate.getTime() === today.getTime();
  });

  if (!todayStat) return 0;

  for (const stat of sortedStats) {
    const statDate = new Date(stat.date);
    statDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate.getTime() - statDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      currentDate = statDate;
    } else {
      break;
    }
  }

  return streak;
}

export function Sidebar() {
  const { 
    currentView, 
    setCurrentView, 
    examMode, 
    setExamMode,
    subjects,
    streak,
    setStreak,
  } = useAppStore();

  const [dueCount, setDueCount] = useState(0);
  const [stats, setStats] = useState({ subjects: 0, exercises: 0 });

  // Load stats with useCallback
  const loadStats = useCallback(async () => {
    try {
      const due = await getDueExercises();
      setDueCount(due.length);

      const fullStats = await getFullStats();
      setStats({ subjects: fullStats.subjects, exercises: fullStats.exercises });

      // Calculate streak
      const reviewStats = await getReviewStats();
      const currentStreak = calculateStreak(reviewStats);
      setStreak(currentStreak);
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  }, [setStreak]);

  useEffect(() => {
    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [subjects, loadStats]);

  // Refresh when view changes to library
  useEffect(() => {
    if (currentView === 'library') {
      loadStats();
    }
  }, [currentView, loadStats]);

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0"
    >
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-xl">🧠</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">SmartRecall</h1>
            <p className="text-xs text-zinc-500">Révision intelligente</p>
          </div>
        </div>
      </div>

      {/* Streak Banner */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-orange-500/15 to-yellow-500/15 border border-orange-500/30"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: 'easeInOut' 
              }}
              className="text-2xl"
            >
              🔥
            </motion.div>
            <div>
              <p className="text-sm font-bold text-orange-300">{streak} jour{streak > 1 ? 's' : ''}</p>
              <p className="text-xs text-orange-400/70">
                {streak >= 30 ? 'Incroyable !' : streak >= 7 ? 'En feu !' : 'Continue !'}
              </p>
            </div>
            <Flame className="w-5 h-5 text-orange-500 ml-auto opacity-50" />
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentView(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left',
              currentView === item.id
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            {item.id === 'library' && dueCount > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                {dueCount}
              </span>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Stats */}
      <div className="p-4 border-t border-zinc-800">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-zinc-100">{stats.subjects}</p>
            <p className="text-xs text-zinc-500">Matières</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-zinc-100">{stats.exercises}</p>
            <p className="text-xs text-zinc-500">Questions</p>
          </div>
        </div>
      </div>

      {/* Exam Mode Selector */}
      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
          Objectif d&apos;examen
        </p>
        <div className="space-y-2">
          {examModeOptions.map((option) => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setExamMode(option.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left',
                examMode === option.id
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                  : 'bg-zinc-900/50 hover:bg-zinc-800/50'
              )}
            >
              <option.icon className={cn(
                'w-4 h-4',
                examMode === option.id ? 'text-cyan-400' : 'text-zinc-500'
              )} />
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  examMode === option.id ? 'text-cyan-400' : 'text-zinc-300'
                )}>
                  {option.label}
                </p>
                <p className="text-xs text-zinc-500">{option.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600 text-center">
          Import JSON • Données locales
        </p>
      </div>
    </motion.aside>
  );
}
