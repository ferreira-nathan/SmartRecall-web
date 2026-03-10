'use client';

import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { useAppStore } from '@/lib/store';
import { useState, useEffect } from 'react';

export function CertaintySlider() {
  const { certainty, setCertainty, showAnswer } = useAppStore();
  const [localValue, setLocalValue] = useState(certainty);

  useEffect(() => {
    setLocalValue(certainty);
  }, [certainty]);

  const getCertaintyColor = (value: number) => {
    if (value < 30) return 'from-red-500 to-orange-500';
    if (value < 60) return 'from-orange-500 to-yellow-500';
    if (value < 80) return 'from-yellow-500 to-green-500';
    return 'from-green-500 to-cyan-500';
  };

  const getCertaintyLabel = (value: number) => {
    if (value < 20) return 'Je ne sais pas du tout';
    if (value < 40) return 'Pas très sûr';
    if (value < 60) return 'Moyennement sûr';
    if (value < 80) return 'Plutôt sûr';
    return 'Certain à 100%';
  };

  const getCertaintyEmoji = (value: number) => {
    if (value < 20) return '😰';
    if (value < 40) return '🤔';
    if (value < 60) return '😐';
    if (value < 80) return '🙂';
    return '😎';
  };

  if (showAnswer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto mb-6"
    >
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-zinc-200">
            À quel point es-tu sûr de toi ?
          </h3>
          <motion.span
            key={localValue}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-2xl"
          >
            {getCertaintyEmoji(localValue)}
          </motion.span>
        </div>

        <div className="relative mb-4">
          <div
            className={`absolute inset-0 h-2 rounded-full bg-gradient-to-r ${getCertaintyColor(localValue)} opacity-20`}
          />
          <Slider
            value={[localValue]}
            onValueChange={(value) => {
              setLocalValue(value[0]);
              setCertainty(value[0]);
            }}
            max={100}
            step={1}
            className="relative z-10"
          />
        </div>

        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>

        <motion.p
          key={localValue}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center text-sm font-medium bg-gradient-to-r ${getCertaintyColor(localValue)} bg-clip-text text-transparent`}
        >
          {getCertaintyLabel(localValue)} ({localValue}%)
        </motion.p>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Risque d&apos;illusion si tu as tort</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Bonne maîtrise attendue</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
