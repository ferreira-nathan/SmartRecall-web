'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, X, Type } from 'lucide-react';
import type { Exercise } from '@/lib/db';

interface FillBlanksProps {
  exercise: Exercise;
  onAnswer: (isCorrect: boolean) => void;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export function FillBlanks({ exercise, onAnswer, showAnswer, onShowAnswer }: FillBlanksProps) {
  const [userInput, setUserInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Parse the question to find blanks (___)
  const parts = exercise.question.split('___');
  const hasBlank = parts.length > 1;

  const handleSubmit = () => {
    if (!showAnswer && !hasSubmitted) {
      setHasSubmitted(true);
      onShowAnswer();

      const isCorrect = userInput.trim().toLowerCase() === exercise.answer.trim().toLowerCase();
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 1500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const isCorrect = userInput.trim().toLowerCase() === exercise.answer.trim().toLowerCase();

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
            <span className="text-xl">✏️</span>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Texte à trous
            </p>
            <p className="text-lg text-zinc-200 leading-relaxed">
              Complète la phrase :
            </p>
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-4 text-lg text-zinc-200 leading-relaxed">
          {hasBlank ? (
            parts.map((part, index) => (
              <span key={index}>
                {part}
                {index < parts.length - 1 && (
                  <motion.span
                    className={`
                      inline-block min-w-[100px] px-3 py-1 mx-1 rounded-lg border-2
                      ${showAnswer
                        ? isCorrect
                          ? 'bg-green-500/20 border-green-500 text-green-300'
                          : 'bg-red-500/20 border-red-500 text-red-300'
                        : 'bg-zinc-700/50 border-zinc-600'
                      }
                    `}
                    initial={{ scale: 1 }}
                    animate={{ scale: showAnswer ? [1, 1.05, 1] : 1 }}
                  >
                    {showAnswer ? exercise.answer : '_____'}
                  </motion.span>
                )}
              </span>
            ))
          ) : (
            exercise.question
          )}
        </div>
      </motion.div>

      {!showAnswer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="relative">
            <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tape ta réponse..."
              className="w-full pl-12 pr-4 py-4 bg-zinc-900/80 border-2 border-zinc-700 rounded-xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!userInput.trim()}
            className={`
              w-full py-4 rounded-xl font-medium transition-all
              ${userInput.trim()
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }
            `}
          >
            Valider ma réponse
          </motion.button>
        </motion.div>
      )}

      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-4">
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-full
                ${isCorrect
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-red-500/20 border border-red-500/50 text-red-400'
                }
              `}>
                {isCorrect ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Correct !</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Incorrect</span>
                  </>
                )}
              </div>
            </div>

            {!isCorrect && (
              <div className="text-center">
                <p className="text-zinc-400 text-sm">
                  Ta réponse : <span className="text-red-400">{userInput}</span>
                </p>
                <p className="text-zinc-400 text-sm">
                  Bonne réponse : <span className="text-green-400">{exercise.answer}</span>
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
