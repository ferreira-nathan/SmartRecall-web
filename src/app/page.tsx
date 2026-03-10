'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { getSubjects, getCourses, getPacks, getSettings } from '@/lib/db';
import { Sidebar } from '@/components/sidebar';
import { Library } from '@/components/library';
import { Manage } from '@/components/manage';
import { Statistics } from '@/components/statistics';
import { ReviewSession } from '@/components/review-session';
import { Settings as SettingsPage } from '@/components/settings';

export default function Home() {
  const { 
    currentView, 
    setSubjects,
    setCourses,
    setPacks,
    setExamMode,
  } = useAppStore();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const subjects = await getSubjects();
      setSubjects(subjects);

      const courses = await getCourses();
      setCourses(courses);

      const packs = await getPacks();
      setPacks(packs);

      const settings = await getSettings();
      setExamMode(settings.examMode);
    }
    loadData();
  }, [setSubjects, setCourses, setPacks, setExamMode]);

  const renderContent = () => {
    switch (currentView) {
      case 'library':
        return (
          <div className="flex-1 overflow-auto">
            <Library />
          </div>
        );
      case 'manage':
        return (
          <div className="flex-1 overflow-auto">
            <Manage />
          </div>
        );
      case 'review':
        return <ReviewSession />;
      case 'stats':
        return (
          <div className="flex-1 overflow-auto">
            <Statistics />
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 overflow-auto">
            <SettingsPage />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
