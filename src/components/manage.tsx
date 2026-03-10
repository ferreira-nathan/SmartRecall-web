/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, ChevronRight, BookOpen, Layers, FileText,
  FolderOpen, Palette, X, Check, Upload
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  getSubjects, addSubject, updateSubject, deleteSubject,
  getCourses, addCourse, updateCourse, deleteCourse,
  getPacks, addPack, updatePack, deletePack,
  getExercises, type Subject, type Course, type Pack, type Exercise
} from '@/lib/db';
import { JSONImporter } from './json-importer';

const COLORS = [
  '#06b6d4', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#3b82f6', '#ef4444', '#eab308',
];

type ViewLevel = 'subjects' | 'courses' | 'packs' | 'exercises';

export function Manage() {
  const {
    subjects, setSubjects,
    courses, setCourses,
    packs, setPacks,
    selectedSubjectId, setSelectedSubjectId,
    selectedCourseId, setSelectedCourseId,
    selectedPackId, setSelectedPackId,
  } = useAppStore();

  const [viewLevel, setViewLevel] = useState<ViewLevel>('subjects');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [showImporter, setShowImporter] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const loadSubjects = useCallback(async () => {
    const data = await getSubjects();
    setSubjects(data);
  }, [setSubjects]);

  const loadCourses = useCallback(async (subjectId: number) => {
    const data = await getCourses(subjectId);
    setCourses(data);
  }, [setCourses]);

  const loadPacks = useCallback(async (courseId: number) => {
    const data = await getPacks(courseId);
    setPacks(data);
  }, [setPacks]);

  const loadExercises = useCallback(async (packId: number) => {
    const data = await getExercises(packId);
    setExercises(data);
  }, []);

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Load courses when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      loadCourses(selectedSubjectId);
      setViewLevel('courses');
    }
  }, [selectedSubjectId, loadCourses]);

  // Load packs when course changes
  useEffect(() => {
    if (selectedCourseId) {
      loadPacks(selectedCourseId);
      setViewLevel('packs');
    }
  }, [selectedCourseId, loadPacks]);

  // Load exercises when pack changes
  useEffect(() => {
    if (selectedPackId) {
      loadExercises(selectedPackId);
      setViewLevel('exercises');
    }
  }, [selectedPackId, loadExercises]);

  const navigateBack = () => {
    if (viewLevel === 'courses') {
      setSelectedSubjectId(null);
      setViewLevel('subjects');
    } else if (viewLevel === 'packs') {
      setSelectedCourseId(null);
      setViewLevel('courses');
    } else if (viewLevel === 'exercises') {
      setSelectedPackId(null);
      setViewLevel('packs');
    }
  };

  // Subject CRUD
  const handleCreateSubject = async () => {
    if (!newName.trim()) return;
    await addSubject(newName, newColor);
    setNewName('');
    setNewColor(COLORS[0]);
    setIsCreating(false);
    loadSubjects();
  };

  const handleUpdateSubject = async (subject: Subject) => {
    await updateSubject(subject.id!, { name: editName });
    setEditingId(null);
    loadSubjects();
  };

  const handleDeleteSubject = async (id: number) => {
    if (confirm('Supprimer cette matière et tout son contenu ?')) {
      await deleteSubject(id);
      loadSubjects();
    }
  };

  // Course CRUD
  const handleCreateCourse = async () => {
    if (!newName.trim() || !selectedSubjectId) return;
    await addCourse(selectedSubjectId, newName);
    setNewName('');
    setIsCreating(false);
    loadCourses(selectedSubjectId);
  };

  const handleUpdateCourse = async (course: Course) => {
    await updateCourse(course.id!, { name: editName });
    setEditingId(null);
    loadCourses(selectedSubjectId!);
  };

  const handleDeleteCourse = async (id: number) => {
    if (confirm('Supprimer ce cours et tout son contenu ?')) {
      await deleteCourse(id);
      loadCourses(selectedSubjectId!);
    }
  };

  // Pack CRUD
  const handleCreatePack = async () => {
    if (!newName.trim() || !selectedCourseId) return;
    await addPack(selectedCourseId, newName);
    setNewName('');
    setIsCreating(false);
    loadPacks(selectedCourseId);
  };

  const handleUpdatePack = async (pack: Pack) => {
    await updatePack(pack.id!, { name: editName });
    setEditingId(null);
    loadPacks(selectedCourseId!);
  };

  const handleDeletePack = async (id: number) => {
    if (confirm('Supprimer ce pack et toutes ses questions ?')) {
      await deletePack(id);
      loadPacks(selectedCourseId!);
    }
  };

  const getBreadcrumb = () => {
    const items = [{ label: 'Matières', action: () => { setSelectedSubjectId(null); setViewLevel('subjects'); } }];

    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (subject) items.push({ label: subject.name, action: () => { setSelectedCourseId(null); setViewLevel('courses'); } });
    }

    if (selectedCourseId) {
      const course = courses.find(c => c.id === selectedCourseId);
      if (course) items.push({ label: course.name, action: () => { setSelectedPackId(null); setViewLevel('packs'); } });
    }

    if (selectedPackId) {
      const pack = packs.find(p => p.id === selectedPackId);
      if (pack) items.push({ label: pack.name, action: () => {} });
    }

    return items;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Organisation</h2>
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

        <div className="flex gap-2">
          {viewLevel !== 'exercises' && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowImporter(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importer JSON
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
              {viewLevel === 'subjects' && (
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-zinc-400" />
                  <div className="flex gap-1">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full ${newColor === c ? 'ring-2 ring-white' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  viewLevel === 'subjects' ? 'Nom de la matière...' :
                  viewLevel === 'courses' ? 'Nom du cours...' :
                  'Nom du pack...'
                }
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <button
                onClick={() => { setIsCreating(false); setNewName(''); }}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={
                  viewLevel === 'subjects' ? handleCreateSubject :
                  viewLevel === 'courses' ? handleCreateCourse :
                  handleCreatePack
                }
                className="p-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lists */}
      <div className="space-y-3">
        {/* Subjects */}
        {viewLevel === 'subjects' && subjects.map((subject, index) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
          >
            {editingId === subject.id ? (
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={async () => {
                        await updateSubject(subject.id!, { color: c });
                        loadSubjects();
                      }}
                      className={`w-5 h-5 rounded-full ${subject.color === c ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-zinc-200"
                  autoFocus
                />
                <button onClick={() => handleUpdateSubject(subject)} className="p-2 bg-cyan-500 rounded-lg text-white">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
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
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(subject.id!); setEditName(subject.name); }}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject.id!)}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedSubjectId(subject.id!)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {/* Courses */}
        {viewLevel === 'courses' && courses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
          >
            {editingId === course.id ? (
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-zinc-200"
                  autoFocus
                />
                <button onClick={() => handleUpdateCourse(course)} className="p-2 bg-cyan-500 rounded-lg text-white">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-200">{course.name}</h3>
                  <p className="text-sm text-zinc-500">
                    {packs.filter(p => p.courseId === course.id).length} packs
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(course.id!); setEditName(course.name); }}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id!)}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedCourseId(course.id!)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {/* Packs */}
        {viewLevel === 'packs' && packs.map((pack, index) => (
          <motion.div
            key={pack.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
          >
            {editingId === pack.id ? (
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-zinc-200"
                  autoFocus
                />
                <button onClick={() => handleUpdatePack(pack)} className="p-2 bg-cyan-500 rounded-lg text-white">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-200">{pack.name}</h3>
                  <p className="text-sm text-zinc-500">
                    {pack.exerciseCount} questions
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(pack.id!); setEditName(pack.name); }}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePack(pack.id!)}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedPackId(pack.id!)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {/* Exercises */}
        {viewLevel === 'exercises' && exercises.map((exercise, index) => (
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-200 truncate">{exercise.question}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                    {exercise.type}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Révisions: {exercise.totalReviews}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Empty state */}
        {viewLevel === 'subjects' && subjects.length === 0 && !isCreating && (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Aucune matière créée</p>
            <p className="text-sm text-zinc-500 mt-1">Clique sur "Nouveau" pour commencer</p>
          </div>
        )}
      </div>

      {/* JSON Importer Modal */}
      <JSONImporter
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        subjectId={selectedSubjectId}
        courseId={selectedCourseId}
        onImportComplete={() => {
          if (selectedCourseId) loadPacks(selectedCourseId);
          else if (selectedSubjectId) loadCourses(selectedSubjectId);
          else loadSubjects();
        }}
      />
    </div>
  );
}
