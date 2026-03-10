/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, Play, Layers, BookOpen,
  FolderOpen, RotateCcw
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { 
  getSubjects, getCourses, getPacks, getExercises, getDueExercises,
  type Subject, type Course, type Pack, type Exercise 
} from '@/lib/db';

type ViewLevel = 'subjects' | 'courses' | 'packs';

// Calculate mastery percentage for exercises
function calculateMastery(exercises: Exercise[]): number {
  if (exercises.length === 0) return 0;
  
  let masteryScore = 0;
  for (const ex of exercises) {
    // Factors: interval (up to 21 days), stability, success rate
    const intervalScore = Math.min(ex.interval / 21, 1) * 40;
    const stabilityScore = ex.stability * 30;
    const successRate = ex.totalReviews > 0 
      ? (ex.correctReviews / ex.totalReviews) * 30 
      : 0;
    masteryScore += intervalScore + stabilityScore + successRate;
  }
  
  return Math.min(100, Math.round(masteryScore / exercises.length));
}

// Get mastery level text and color
function getMasteryInfo(mastery: number): { label: string; color: string; bgColor: string } {
  if (mastery >= 80) return { label: 'Maîtrisé', color: 'text-green-400', bgColor: 'bg-green-500/20' };
  if (mastery >= 50) return { label: 'En progression', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
  if (mastery >= 20) return { label: 'En apprentissage', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
  return { label: 'Nouveau', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' };
}

export function Library() {
  const {
    subjects, setSubjects,
    courses, setCourses,
    packs, setPacks,
    selectedSubjectId, setSelectedSubjectId,
    selectedCourseId, setSelectedCourseId,
    setReviewQueue,
    setCurrentSubject,
    setCurrentCourse,
    setCurrentPack,
    setCurrentView,
    startSession,
    setCurrentExerciseIndex,
  } = useAppStore();

  const [viewLevel, setViewLevel] = useState<ViewLevel>('subjects');
  const [dueCounts, setDueCounts] = useState<Record<number, number>>({});
  const [statsMap, setStatsMap] = useState<Record<number, { total: number; mastered: number; learning: number; mastery: number }>>({});

  const calculateSubjectStats = useCallback(async (subjectsList: Subject[]) => {
    const stats: Record<number, { total: number; mastered: number; learning: number; mastery: number }> = {};
    const due: Record<number, number> = {};

    for (const subject of subjectsList) {
      const subjectCourses = await getCourses(subject.id!);
      let total = 0, mastered = 0, learning = 0;
      const allExercises: Exercise[] = [];
      
      for (const course of subjectCourses) {
        const coursePacks = await getPacks(course.id!);
        for (const pack of coursePacks) {
          const packExercises = await getExercises(pack.id!);
          allExercises.push(...packExercises);
          total += packExercises.length;
          mastered += packExercises.filter(e => e.interval >= 21 && e.stability >= 0.8).length;
          learning += packExercises.filter(e => e.totalReviews > 0 && (e.interval < 21 || e.stability < 0.8)).length;
        }
      }

      stats[subject.id!] = { 
        total, 
        mastered, 
        learning, 
        mastery: calculateMastery(allExercises) 
      };
      due[subject.id!] = (await getDueExercises(undefined, undefined, subject.id)).length;
    }

    setStatsMap(stats);
    setDueCounts(due);
  }, []);

  const calculateCourseStats = useCallback(async (coursesList: Course[]) => {
    const stats: Record<number, { total: number; mastered: number; learning: number; mastery: number }> = {};
    const due: Record<number, number> = {};

    for (const course of coursesList) {
      const coursePacks = await getPacks(course.id!);
      let total = 0, mastered = 0, learning = 0;
      const allExercises: Exercise[] = [];

      for (const pack of coursePacks) {
        const packExercises = await getExercises(pack.id!);
        allExercises.push(...packExercises);
        total += packExercises.length;
        mastered += packExercises.filter(e => e.interval >= 21 && e.stability >= 0.8).length;
        learning += packExercises.filter(e => e.totalReviews > 0 && (e.interval < 21 || e.stability < 0.8)).length;
      }

      stats[course.id!] = { 
        total, 
        mastered, 
        learning, 
        mastery: calculateMastery(allExercises) 
      };
      due[course.id!] = allExercises.filter(e => new Date(e.nextReview) <= new Date()).length;
    }

    setStatsMap(stats);
    setDueCounts(due);
  }, []);

  const calculatePackStats = useCallback(async (packsList: Pack[]) => {
    const stats: Record<number, { total: number; mastered: number; learning: number; mastery: number }> = {};
    const due: Record<number, number> = {};

    for (const pack of packsList) {
      const packExercises = await getExercises(pack.id!);
      const total = packExercises.length;
      const mastered = packExercises.filter(e => e.interval >= 21 && e.stability >= 0.8).length;
      const learning = packExercises.filter(e => e.totalReviews > 0 && (e.interval < 21 || e.stability < 0.8)).length;

      stats[pack.id!] = { 
        total, 
        mastered, 
        learning, 
        mastery: calculateMastery(packExercises) 
      };
      due[pack.id!] = packExercises.filter(e => new Date(e.nextReview) <= new Date()).length;
    }

    setStatsMap(stats);
    setDueCounts(due);
  }, []);

  const loadSubjects = useCallback(async () => {
    const data = await getSubjects();
    setSubjects(data);
    calculateSubjectStats(data);
  }, [setSubjects, calculateSubjectStats]);

  const loadCourses = useCallback(async (subjectId: number) => {
    const data = await getCourses(subjectId);
    setCourses(data);
    calculateCourseStats(data);
  }, [setCourses, calculateCourseStats]);

  const loadPacks = useCallback(async (courseId: number) => {
    const data = await getPacks(courseId);
    setPacks(data);
    calculatePackStats(data);
  }, [setPacks, calculatePackStats]);

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Load courses when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      loadCourses(selectedSubjectId);
      setViewLevel('courses');
    } else {
      setViewLevel('subjects');
    }
  }, [selectedSubjectId, loadCourses]);

  // Load packs when course changes
  useEffect(() => {
    if (selectedCourseId) {
      loadPacks(selectedCourseId);
      setViewLevel('packs');
    } else if (selectedSubjectId) {
      setViewLevel('courses');
    }
  }, [selectedCourseId, selectedSubjectId, loadPacks]);

  const handleStartReview = useCallback(async (
    subject: Subject | null,
    course: Course | null,
    pack: Pack | null,
    onlyDue: boolean = true
  ) => {
    let reviewExercises: Exercise[] = [];

    if (pack) {
      if (onlyDue) {
        reviewExercises = await getDueExercises(pack.id);
      }
      // If no due exercises or user wants all, get all
      if (reviewExercises.length === 0 || !onlyDue) {
        reviewExercises = await getExercises(pack.id);
      }
      setCurrentPack(pack);
    } else if (course) {
      if (onlyDue) {
        reviewExercises = await getDueExercises(undefined, course.id);
      }
      if (reviewExercises.length === 0 || !onlyDue) {
        const coursePacks = await getPacks(course.id!);
        for (const p of coursePacks) {
          const pEx = await getExercises(p.id!);
          reviewExercises.push(...pEx);
        }
      }
      setCurrentCourse(course);
    } else if (subject) {
      if (onlyDue) {
        reviewExercises = await getDueExercises(undefined, undefined, subject.id);
      }
      if (reviewExercises.length === 0 || !onlyDue) {
        const subjectCourses = await getCourses(subject.id!);
        for (const c of subjectCourses) {
          const cPacks = await getPacks(c.id!);
          for (const p of cPacks) {
            const pEx = await getExercises(p.id!);
            reviewExercises.push(...pEx);
          }
        }
      }
      setCurrentSubject(subject);
    }

    if (reviewExercises.length === 0) {
      alert('Aucune question dans ce pack !');
      return;
    }

    // Shuffle exercises for variety
    reviewExercises = reviewExercises.sort(() => Math.random() - 0.5);

    setReviewQueue(reviewExercises);
    setCurrentExerciseIndex(0);
    startSession();
    setCurrentView('review');
  }, [setCurrentPack, setCurrentCourse, setCurrentSubject, setReviewQueue, setCurrentExerciseIndex, startSession, setCurrentView]);

  const getBreadcrumb = useCallback(() => {
    const items = [
      { label: 'Matières', action: () => { setSelectedSubjectId(null); setSelectedCourseId(null); } }
    ];

    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (subject) items.push({ label: subject.name, action: () => setSelectedCourseId(null) });
    }

    if (selectedCourseId) {
      const course = courses.find(c => c.id === selectedCourseId);
      if (course) items.push({ label: course.name, action: () => {} });
    }

    return items;
  }, [selectedSubjectId, selectedCourseId, subjects, courses, setSelectedSubjectId, setSelectedCourseId]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Bibliothèque</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
              {getBreadcrumb().map((item, i, arr) => (
                <span key={i} className="flex items-center gap-2">
                  <button onClick={item.action} className="hover:text-cyan-400 transition-colors">
                    {item.label}
                  </button>
                  {i < arr.length - 1 && <ChevronRight className="w-4 h-4" />}
                </span>
              ))}
            </div>
          </div>

          {viewLevel !== 'subjects' && (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartReview(
                  subjects.find(s => s.id === selectedSubjectId) || null,
                  courses.find(c => c.id === selectedCourseId) || null,
                  null,
                  false
                )}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Tout réviser
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartReview(
                  subjects.find(s => s.id === selectedSubjectId) || null,
                  courses.find(c => c.id === selectedCourseId) || null,
                  null,
                  true
                )}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Réviser dues
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Subjects Grid */}
      {viewLevel === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {subjects.map((subject, index) => {
              const stats = statsMap[subject.id!] || { total: 0, mastered: 0, learning: 0, mastery: 0 };
              const dueCount = dueCounts[subject.id!] || 0;
              const masteryInfo = getMasteryInfo(stats.mastery);

              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors group cursor-pointer"
                  onClick={() => setSelectedSubjectId(subject.id!)}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: subject.color + '30' }}
                      >
                        {subject.icon || '📚'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-200">{subject.name}</h3>
                        <p className="text-sm text-zinc-500">
                          {courses.filter(c => c.subjectId === subject.id).length} cours
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                    </div>

                    {/* Mastery bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${masteryInfo.color}`}>
                          {masteryInfo.label}
                        </span>
                        <span className="text-xs text-zinc-500">{stats.mastery}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.mastery}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">{stats.total} questions</span>
                      {dueCount > 0 && (
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">
                          {dueCount} à réviser
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Courses Grid */}
      {viewLevel === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {courses.map((course, index) => {
              const stats = statsMap[course.id!] || { total: 0, mastered: 0, learning: 0, mastery: 0 };
              const dueCount = dueCounts[course.id!] || 0;
              const masteryInfo = getMasteryInfo(stats.mastery);

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors group cursor-pointer"
                  onClick={() => setSelectedCourseId(course.id!)}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-200">{course.name}</h3>
                        <p className="text-sm text-zinc-500">
                          {packs.filter(p => p.courseId === course.id).length} packs
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                    </div>

                    {/* Mastery bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${masteryInfo.color}`}>
                          {masteryInfo.label}
                        </span>
                        <span className="text-xs text-zinc-500">{stats.mastery}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
                          animate={{ width: `${stats.mastery}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">{stats.total} questions</span>
                      {dueCount > 0 && (
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">
                          {dueCount} à réviser
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Packs Grid */}
      {viewLevel === 'packs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {packs.map((pack, index) => {
              const stats = statsMap[pack.id!] || { total: 0, mastered: 0, learning: 0, mastery: 0 };
              const dueCount = dueCounts[pack.id!] || 0;
              const masteryInfo = getMasteryInfo(stats.mastery);

              return (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors group"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-200">{pack.name}</h3>
                        <p className="text-sm text-zinc-500">
                          {pack.exerciseCount} questions
                        </p>
                      </div>
                    </div>

                    {/* Mastery bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${masteryInfo.color}`}>
                          {masteryInfo.label}
                        </span>
                        <span className="text-xs text-zinc-500">{stats.mastery}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
                          animate={{ width: `${stats.mastery}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">
                        {stats.mastered}/{stats.total} maîtrisées
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReview(null, null, pack, false);
                        }}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm text-zinc-300 flex items-center justify-center gap-2 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Tout réviser
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReview(null, null, pack, true);
                        }}
                        className={`
                          flex-1 py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all
                          ${dueCount > 0
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }
                        `}
                      >
                        <Play className="w-4 h-4" />
                        {dueCount > 0 ? `${dueCount} dues` : 'Réviser'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty States */}
      {viewLevel === 'subjects' && subjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <FolderOpen className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-xl font-medium text-zinc-300 mb-2">Aucune matière</h3>
          <p className="text-zinc-500 mb-4">
            Va dans l&apos;onglet Organisation pour créer ta première matière
          </p>
        </motion.div>
      )}

      {viewLevel === 'courses' && courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <BookOpen className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-xl font-medium text-zinc-300 mb-2">Aucun cours dans cette matière</h3>
          <p className="text-zinc-500">
            Ajoute des cours via l&apos;onglet Organisation
          </p>
        </motion.div>
      )}

      {viewLevel === 'packs' && packs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Layers className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-xl font-medium text-zinc-300 mb-2">Aucun pack dans ce cours</h3>
          <p className="text-zinc-500">
            Ajoute des packs via l&apos;onglet Organisation
          </p>
        </motion.div>
      )}
    </div>
  );
}
