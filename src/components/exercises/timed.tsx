'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Timer, Check, X, AlertTriangle } from 'lucide-react';
import type { Exercise } from '@/lib/db';

interface TimedProps {
  exercise: Exercise;
  onAnswer: (isCorrect: boolean) => void;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export function Timed({ exercise, onAnswer, showAnswer, onShowAnswer }: TimedProps) {
  const [timeLeft, setTimeLeft] = useState(exercise.timing || 15);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const totalTime = exercise.timing || 15;
  const progress = (timeLeft / totalTime) * 100;

  const handleTimeout = useCallback(() => {
    if (!showAnswer) {
      setHasTimedOut(true);
      onShowAnswer();
      setTimeout(() => {
        onAnswer(false);
      }, 2000);
    }
  }, [showAnswer, onShowAnswer, onAnswer]);

  useEffect(() => {
    if (showAnswer) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showAnswer, handleTimeout]);

  const handleSelect = (option: string) => {
    if (!showAnswer && !hasTimedOut) {
      setSelectedOption(option);
      onShowAnswer();

      const isCorrect = option === exercise.answer;
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 1500);
    }
  };

  const getProgressColor = () => {
    if (progress > 60) return 'from-green-500 to-emerald-500';
    if (progress > 30) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getOptionStyle = (option: string) => {
    if (!showAnswer && !hasTimedOut) {
      return selectedOption === option
        ? 'border-cyan-500 bg-cyan-500/10'
        : 'border-zinc-700 hover:border-zinc-500';
    }

    if (option === exercise.answer) {
      return 'border-green-500 bg-green-500/20';
    }

    if (selectedOption === option && option !== exercise.answer) {
      return 'border-red-500 bg-red-500/20';
    }

    return 'border-zinc-800 opacity-50';
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Timer */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${
              progress <= 30 ? 'text-red-400 animate-pulse' : 'text-zinc-400'
            }`} />
            <span className={`text-sm font-mono ${
              progress <= 30 ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {timeLeft}s restantes
            </span>
          </div>
          <span className={`text-sm font-mono ${
            progress <= 30 ? 'text-red-400' : 'text-zinc-500'
          }`}>
            / {totalTime}s
          </span>
        </div>

        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${getProgressColor()}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {progress <= 30 && progress > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-2 text-yellow-400 text-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            Dépêche-toi !
          </motion.div>
        )}
      </motion.div>

      {/* Question */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-xl">⚡</span>
          </div>
          <p className="text-lg text-zinc-200 leading-relaxed">
            {exercise.question}
          </p>
        </div>
      </motion.div>

      {/* Options */}
      <div className="space-y-3">
        {exercise.options?.map((option, index) => (
          <motion.button
            key={option}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleSelect(option)}
            disabled={showAnswer || hasTimedOut}
            className={`
              w-full p-4 rounded-xl border-2 transition-all duration-300 text-left
              flex items-center justify-between gap-4
              ${getOptionStyle(option)}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-400">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-zinc-200">{option}</span>
            </div>
            {showAnswer && option === exercise.answer && (
              <Check className="w-5 h-5 text-green-400" />
            )}
            {showAnswer && selectedOption === option && option !== exercise.answer && (
              <X className="w-5 h-5 text-red-400" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Timeout message */}
      <AnimatePresence>
        {hasTimedOut && !selectedOption && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-red-400">
              <Timer className="w-4 h-4" />
              <span>Temps écoulé ! La réponse était : {exercise.answer}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {showAnswer && selectedOption && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-center"
          >
            {selectedOption === exercise.answer ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full text-green-400">
                <Check className="w-4 h-4" />
                <span>Correct ! (+{timeLeft}s bonus)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-red-400">
                <X className="w-4 h-4" />
                <span>Incorrect. La réponse était : {exercise.answer}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
