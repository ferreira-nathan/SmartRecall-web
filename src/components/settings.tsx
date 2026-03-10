'use client';

import { motion } from 'framer-motion';
import { 
  Zap, 
  Target, 
  BookOpen, 
  Trash2, 
  Database,
  Info,
  Download
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { db, getSettings, updateSettings } from '@/lib/db';
import type { ExamMode } from '@/lib/spaced-repetition';
import { useState, useEffect } from 'react';

const examModeOptions: { id: ExamMode; label: string; description: string; icon: typeof Zap; details: string }[] = [
  { 
    id: '1day', 
    label: 'Examen demain', 
    description: 'Mode intensif', 
    icon: Zap,
    details: 'Les intervalles sont divisés par 10 pour une révision rapide'
  },
  { 
    id: '1week', 
    label: 'Examen dans 1 semaine', 
    description: 'Mode modéré', 
    icon: Target,
    details: 'Les intervalles sont divisés par 3 pour une révision accélérée'
  },
  { 
    id: '1month', 
    label: 'Examen dans 1 mois', 
    description: 'Mode normal', 
    icon: BookOpen,
    details: 'Intervalles standard pour une mémorisation durable'
  },
];

export function Settings() {
  const { examMode, setExamMode } = useAppStore();
  const [isClearing, setIsClearing] = useState(false);
  const [stats, setStats] = useState({ subjects: 0, courses: 0, packs: 0, exercises: 0, reviews: 0 });

  useEffect(() => {
    async function loadStats() {
      const subjects = await db.subjects.count();
      const courses = await db.courses.count();
      const packs = await db.packs.count();
      const exercises = await db.exercises.count();
      const reviews = await db.reviewStats.count();
      setStats({ subjects, courses, packs, exercises, reviews });
    }
    loadStats();
  }, []);

  const handleModeChange = async (mode: ExamMode) => {
    setExamMode(mode);
    await updateSettings({ examMode: mode });
  };

  const handleClearData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.')) {
      return;
    }

    setIsClearing(true);
    try {
      await db.subjects.clear();
      await db.courses.clear();
      await db.packs.clear();
      await db.exercises.clear();
      await db.reviewStats.clear();
      await db.settings.clear();
      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportData = async () => {
    const subjects = await db.subjects.toArray();
    const courses = await db.courses.toArray();
    const packs = await db.packs.toArray();
    const exercises = await db.exercises.toArray();

    const exportData = {
      exportDate: new Date().toISOString(),
      subjects,
      courses,
      packs,
      exercises: exercises.map(e => ({
        packId: e.packId,
        type: e.type,
        question: e.question,
        options: e.options,
        answer: e.answer,
        timing: e.timing,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartrecall-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Paramètres</h2>
        <p className="text-zinc-400">Configure ton expérience d&apos;apprentissage</p>
      </div>

      {/* Exam Mode */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6"
      >
        <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Objectif d&apos;examen
        </h3>
        <p className="text-sm text-zinc-400 mb-6">
          Adapte les intervalles de révision selon ta date d&apos;examen
        </p>

        <div className="space-y-3">
          {examModeOptions.map((option) => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleModeChange(option.id)}
              className={`
                w-full p-4 rounded-xl border-2 transition-all text-left
                ${examMode === option.id
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  examMode === option.id ? 'bg-cyan-500/20' : 'bg-zinc-700/50'
                }`}>
                  <option.icon className={`w-5 h-5 ${
                    examMode === option.id ? 'text-cyan-400' : 'text-zinc-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${
                      examMode === option.id ? 'text-cyan-400' : 'text-zinc-200'
                    }`}>
                      {option.label}
                    </span>
                    <span className={`text-sm ${
                      examMode === option.id ? 'text-cyan-400' : 'text-zinc-500'
                    }`}>
                      {option.description}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{option.details}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Data Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6"
      >
        <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          Données locales
        </h3>

        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
            <p className="text-xl font-bold text-zinc-100">{stats.subjects}</p>
            <p className="text-xs text-zinc-500">Matières</p>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
            <p className="text-xl font-bold text-zinc-100">{stats.courses}</p>
            <p className="text-xs text-zinc-500">Cours</p>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
            <p className="text-xl font-bold text-zinc-100">{stats.packs}</p>
            <p className="text-xs text-zinc-500">Packs</p>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
            <p className="text-xl font-bold text-zinc-100">{stats.exercises}</p>
            <p className="text-xs text-zinc-500">Questions</p>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
            <p className="text-xl font-bold text-zinc-100">{stats.reviews}</p>
            <p className="text-xs text-zinc-500">Sessions</p>
          </div>
        </div>

        <p className="text-sm text-zinc-500 mb-4">
          Toutes les données sont stockées localement dans ton navigateur (IndexedDB).
          Aucune donnée n&apos;est envoyée à des serveurs externes.
        </p>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportData}
            className="flex-1 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter les données
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClearData}
            disabled={isClearing}
            className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isClearing ? 'Suppression...' : 'Effacer tout'}
          </motion.button>
        </div>
      </motion.div>

      {/* JSON Template */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6"
      >
        <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-cyan-400" />
          Format JSON pour l&apos;import
        </h3>

        <p className="text-sm text-zinc-400 mb-4">
          Utilise ce format pour créer tes fichiers JSON à importer :
        </p>

        <pre className="bg-zinc-800 rounded-xl p-4 text-xs text-zinc-300 overflow-auto max-h-64 font-mono">
{`{
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
              "type": "flashcard",
              "question": "Quelle est la formule du discriminant ?",
              "answer": "Δ = b² - 4ac",
              "timing": 15
            },
            {
              "type": "mcq",
              "question": "Si Δ > 0, combien de solutions ?",
              "options": ["0", "1", "2", "Infini"],
              "answer": "2"
            },
            {
              "type": "trueFalse",
              "question": "Si Δ = 0, une seule solution.",
              "answer": "Vrai"
            },
            {
              "type": "fillBlank",
              "question": "Les solutions sont x = ___",
              "answer": "(-b ± √Δ) / 2a"
            },
            {
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
}`}
        </pre>

        <div className="mt-4 text-sm text-zinc-500">
          <p><strong className="text-zinc-300">Types disponibles :</strong> flashcard, mcq, trueFalse, fillBlank, timed</p>
          <p><strong className="text-zinc-300">Timing :</strong> temps suggéré en secondes (défaut: 15s)</p>
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-400" />
          À propos
        </h3>
        
        <div className="space-y-4 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-200">SmartRecall</strong> est une application de révision intelligente
            utilisant l&apos;algorithme SM-2 modifié pour optimiser ta mémorisation.
          </p>
          <p>
            <strong className="text-zinc-200">Fonctionnalités clés :</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Import JSON manuel pour tes questions</li>
            <li>Organisation : Matières → Cours → Packs</li>
            <li>Répétition espacée adaptative (SM-2)</li>
            <li>Indice de certitude avec détection des illusions</li>
            <li>5 types d&apos;exercices différents</li>
            <li>Statistiques détaillées et heatmap</li>
          </ul>
          <p>
            <strong className="text-zinc-200">Version :</strong> 2.0.0 (sans IA)
          </p>
        </div>
      </motion.div>
    </div>
  );
}
