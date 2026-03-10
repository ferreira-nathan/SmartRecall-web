'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Exercise } from '@/lib/db';

interface FlashcardProps {
  exercise: Exercise;
  onAnswer: (isCorrect: boolean) => void;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export function Flashcard({ exercise, onAnswer, showAnswer, onShowAnswer }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    if (!showAnswer) {
      onShowAnswer();
      setIsFlipped(true);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    setIsFlipped(false);
    onAnswer(isCorrect);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Card Container */}
      <div 
        className="relative w-full cursor-pointer"
        style={{ aspectRatio: '3/2' }}
        onClick={handleFlip}
      >
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            /* Front Face - Question */
            <motion.div
              key="front"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700 rounded-2xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent rounded-2xl" />
              
              <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <p className="text-xl text-zinc-200 leading-relaxed">
                  {exercise.question}
                </p>
                <p className="text-zinc-500 text-sm mt-6">
                  Clique pour révéler la réponse
                </p>
              </div>
            </motion.div>
          ) : (
            /* Back Face - Answer */
            <motion.div
              key="back"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-cyan-500/50 rounded-2xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent rounded-2xl" />
              
              <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">💡</span>
                </div>
                <p className="text-2xl font-semibold text-cyan-300 mb-4">
                  {exercise.answer}
                </p>
                <p className="text-zinc-500 text-sm">
                  Tu avais la bonne réponse ?
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Answer buttons */}
      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-center gap-4 mt-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(false)}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
              Faux
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-400 transition-colors"
            >
              <Check className="w-5 h-5" />
              Juste
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
