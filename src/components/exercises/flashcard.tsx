'use client';

import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Exercise } from '@/lib/db';
import { useIsMobile } from '@/hooks/use-mobile';

interface FlashcardProps {
  exercise: Exercise;
  onAnswer: (isCorrect: boolean) => void;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export function Flashcard({ exercise, onAnswer, showAnswer, onShowAnswer }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const isMobile = useIsMobile();

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const bgOpacityGreen = useTransform(x, [0, 100, 200], [0, 0.3, 0.6]);
  const bgOpacityRed = useTransform(x, [-200, -100, 0], [0.6, 0.3, 0]);

  const handleFlip = () => {
    if (!showAnswer) {
      onShowAnswer();
      setIsFlipped(true);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    setIsFlipped(false);
    setDragDirection(null);
    onAnswer(isCorrect);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      handleAnswer(true);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      handleAnswer(false);
    }
    setDragDirection(null);
  };

  const handleDrag = (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x > 30) setDragDirection('right');
    else if (info.offset.x < -30) setDragDirection('left');
    else setDragDirection(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Swipe indicators (behind the card) */}
      {showAnswer && isMobile && (
        <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none z-0">
          <motion.div
            style={{ opacity: bgOpacityRed }}
            className="w-16 h-16 rounded-full bg-red-500/30 flex items-center justify-center"
          >
            <X className="w-8 h-8 text-red-400" />
          </motion.div>
          <motion.div
            style={{ opacity: bgOpacityGreen }}
            className="w-16 h-16 rounded-full bg-green-500/30 flex items-center justify-center"
          >
            <Check className="w-8 h-8 text-green-400" />
          </motion.div>
        </div>
      )}

      {/* Card Container */}
      <motion.div 
        className="relative w-full cursor-pointer select-none z-10"
        style={{ 
          aspectRatio: '3/2',
          x: showAnswer && isMobile ? x : 0,
          rotate: showAnswer && isMobile ? rotate : 0,
        }}
        drag={showAnswer && isMobile ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={showAnswer && isMobile ? handleDragEnd : undefined}
        onDrag={showAnswer && isMobile ? handleDrag : undefined}
        onClick={!showAnswer ? handleFlip : undefined}
        whileTap={!showAnswer ? { scale: 0.98 } : undefined}
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
                  {isMobile ? 'Touche pour révéler' : 'Clique pour révéler la réponse'}
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
              className={`absolute inset-0 rounded-2xl overflow-hidden ${
                dragDirection === 'right' 
                  ? 'ring-2 ring-green-500/50' 
                  : dragDirection === 'left' 
                    ? 'ring-2 ring-red-500/50' 
                    : ''
              }`}
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
                  {isMobile ? '← Glisse: Faux | Juste: Glisse →' : 'Tu avais la bonne réponse ?'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Answer buttons (always visible on desktop, hidden on mobile during swipe) */}
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
