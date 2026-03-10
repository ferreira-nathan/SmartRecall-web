'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Exercise } from '@/lib/db';

interface TrueFalseProps {
  exercise: Exercise;
  onAnswer: (isCorrect: boolean) => void;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export function TrueFalse({ exercise, onAnswer, showAnswer, onShowAnswer }: TrueFalseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const correctAnswer = exercise.answer.toLowerCase() === 'vrai' || exercise.answer.toLowerCase() === 'true';

  const handleAnswer = (value: boolean) => {
    if (!showAnswer) {
      setSelectedAnswer(value);
      onShowAnswer();

      const isCorrect = value === correctAnswer;
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 1500);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
            <span className="text-2xl">⚖️</span>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Vrai ou Faux ?
            </p>
            <p className="text-xl text-zinc-200 leading-relaxed">
              {exercise.question}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex justify-center gap-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAnswer(true)}
          disabled={showAnswer}
          className={`
            relative w-36 h-36 rounded-2xl border-2 transition-all duration-300
            flex flex-col items-center justify-center gap-3
            ${!showAnswer
              ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20'
              : selectedAnswer === true
                ? correctAnswer === true
                  ? 'border-green-500 bg-green-500/30'
                  : 'border-red-500 bg-red-500/30'
                : correctAnswer === true
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-zinc-800 opacity-50'
            }
          `}
        >
          <ThumbsUp
            className={`w-10 h-10 ${
              showAnswer && selectedAnswer === true && correctAnswer !== true
                ? 'text-red-400'
                : 'text-green-400'
            }`}
          />
          <span className={`text-lg font-medium ${
            showAnswer && selectedAnswer === true && correctAnswer !== true
              ? 'text-red-400'
              : 'text-green-400'
          }`}>
            Vrai
          </span>

          <AnimatePresence>
            {showAnswer && correctAnswer === true && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
            )}
            {showAnswer && selectedAnswer === true && correctAnswer !== true && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAnswer(false)}
          disabled={showAnswer}
          className={`
            relative w-36 h-36 rounded-2xl border-2 transition-all duration-300
            flex flex-col items-center justify-center gap-3
            ${!showAnswer
              ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20'
              : selectedAnswer === false
                ? correctAnswer === false
                  ? 'border-green-500 bg-green-500/30'
                  : 'border-red-500 bg-red-500/30'
                : correctAnswer === false
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-zinc-800 opacity-50'
            }
          `}
        >
          <ThumbsDown
            className={`w-10 h-10 ${
              showAnswer && selectedAnswer === false && correctAnswer !== false
                ? 'text-red-400'
                : 'text-red-400'
            }`}
          />
          <span className="text-lg font-medium text-red-400">
            Faux
          </span>

          <AnimatePresence>
            {showAnswer && correctAnswer === false && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
            )}
            {showAnswer && selectedAnswer === false && correctAnswer !== false && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 text-center"
          >
            {selectedAnswer === correctAnswer ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full text-green-400">
                <Check className="w-4 h-4" />
                <span>Correct !</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-red-400">
                <X className="w-4 h-4" />
                <span>La réponse était : {correctAnswer ? 'Vrai' : 'Faux'}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
