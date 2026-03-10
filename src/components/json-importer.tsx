'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, AlertTriangle, FileJson } from 'lucide-react';
import { importFromJSON, addExercises, addPack, addCourse, addSubject, getCourses, type FullImportJSON, type PackImportJSON, type CourseImportJSON } from '@/lib/db';

interface JSONImporterProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId?: number | null;
  courseId?: number | null;
  onImportComplete: () => void;
}

const EXAMPLE_JSON = `{
  "subject": {
    "name": "Mathématiques",
    "color": "#8b5cf6",
    "icon": "📐"
  },
  "courses": [
    {
      "name": "Algèbre",
      "description": "Équations et polynômes",
      "packs": [
        {
          "name": "Équations du second degré",
          "description": "Résolution d'équations",
          "exercises": [
            {
              "id": "ex1",
              "type": "flashcard",
              "question": "Quelle est la formule du discriminant ?",
              "answer": "Δ = b² - 4ac",
              "timing": 15
            },
            {
              "id": "ex2",
              "type": "mcq",
              "question": "Si Δ > 0, combien de solutions réelles ?",
              "options": ["0", "1", "2", "Infini"],
              "answer": "2",
              "timing": 20
            },
            {
              "id": "ex3",
              "type": "trueFalse",
              "question": "Si Δ = 0, l'équation admet deux solutions identiques.",
              "answer": "Vrai",
              "timing": 15
            },
            {
              "id": "ex4",
              "type": "fillBlank",
              "question": "Les solutions de ax² + bx + c = 0 sont x = ___",
              "answer": "(-b ± √Δ) / 2a",
              "timing": 30
            },
            {
              "id": "ex5",
              "type": "timed",
              "question": "Calcule Δ pour x² - 5x + 6 = 0",
              "options": ["0", "1", "2", "25"],
              "answer": "1",
              "timing": 10
            }
          ]
        }
      ]
    }
  ]
}`;

type ImportMode = 'full' | 'course' | 'pack';

export function JSONImporter({ isOpen, onClose, subjectId, courseId, onImportComplete }: JSONImporterProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const getImportMode = (): ImportMode => {
    if (courseId) return 'pack';
    if (subjectId) return 'course';
    return 'full';
  };

  const validateJSON = (): { valid: boolean; data?: any; error?: string } => {
    try {
      const data = JSON.parse(jsonText);
      return { valid: true, data };
    } catch (e: any) {
      return { valid: false, error: `JSON invalide: ${e.message}` };
    }
  };

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    setIsValidating(true);

    const { valid, data, error: parseError } = validateJSON();
    if (!valid) {
      setError(parseError || 'JSON invalide');
      setIsValidating(false);
      return;
    }

    try {
      const mode = getImportMode();

      if (mode === 'full') {
        // Full import with subject
        const result = await importFromJSON(data as FullImportJSON);
        setSuccess(`Importé: ${result.coursesCreated} cours, ${result.packsCreated} packs, ${result.exercisesCreated} questions`);
      } else if (mode === 'course') {
        // Import courses into existing subject
        const coursesData = data.courses || [data];
        for (const courseData of coursesData) {
          const newCourseId = await addCourse(subjectId!, courseData.name, courseData.description);
          for (const packData of courseData.packs || []) {
            const packId = await addPack(newCourseId, packData.name, packData.description);
            await addExercises(packId, packData.exercises);
          }
        }
        setSuccess(`Cours importés avec succès`);
      } else if (mode === 'pack') {
        // Import packs into existing course
        const packsData = data.packs || [data];
        for (const packData of packsData) {
          const packId = await addPack(courseId!, packData.name, packData.description);
          await addExercises(packId, packData.exercises);
        }
        setSuccess(`Packs importés avec succès`);
      }

      setJsonText('');
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(`Erreur lors de l'import: ${e.message}`);
    }

    setIsValidating(false);
  };

  const loadExample = () => {
    setJsonText(EXAMPLE_JSON);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <FileJson className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-200">Importer un JSON</h3>
                <p className="text-sm text-zinc-500">
                  {getImportMode() === 'full' && 'Import complet (Matière + Cours + Packs)'}
                  {getImportMode() === 'course' && 'Import de cours dans la matière sélectionnée'}
                  {getImportMode() === 'pack' && 'Import de packs dans le cours sélectionné'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Colle ton JSON ou charge un exemple
              </p>
              <button
                onClick={loadExample}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Charger un exemple
              </button>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setError(null); setSuccess(null); }}
              placeholder='{\n  "subject": { "name": "...", "color": "#..." },\n  "courses": [...]\n}'
              className="w-full h-64 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-zinc-200 font-mono text-sm resize-none focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600"
            />

            {/* Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-start gap-3"
                >
                  <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-300">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              Annuler
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleImport}
              disabled={!jsonText.trim() || isValidating}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Importer
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
