'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import type { Exercise } from '@/lib/db';

interface MCQProps {
  exercise: Exercise;
  onAnswer: (isCorrect: boolean) => void;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export function MCQ({ exercise, onAnswer, showAnswer, onShowAnswer }: MCQProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (!showAnswer) {
      setSelectedOption(option);
      onShowAnswer();

      const isCorrect = option === exercise.answer;
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 1500);
    }
  };

  const getOptionStyle = (option: string) => {
    if (!showAnswer) {
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

  const getOptionIcon = (option: string) => {
    if (!showAnswer) {
      return <HelpCircle className="w-5 h-5 text-zinc-500" />;
    }

    if (option === exercise.answer) {
      return <Check className="w-5 h-5 text-green-400" />;
    }

    if (selectedOption === option && option !== exercise.answer) {
      return <X className="w-5 h-5 text-red-400" />;
    }

    return null;
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <span className="text-xl">❓</span>
          </div>
          <p className="text-lg text-zinc-200 leading-relaxed">
            {exercise.question}
          </p>
        </div>
      </motion.div>

      <div className="space-y-3">
        <AnimatePresence>
          {exercise.options?.map((option, index) => (
            <motion.button
              key={option}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(option)}
              disabled={showAnswer}
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
              {getOptionIcon(option)}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-center"
          >
            {selectedOption === exercise.answer ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full text-green-400">
                <Check className="w-4 h-4" />
                <span>Correct !</span>
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
