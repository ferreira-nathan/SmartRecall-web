'use client';

import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  onFlip?: () => void;           // Space
  onCorrect?: () => void;        // ArrowRight or K
  onIncorrect?: () => void;      // ArrowLeft or J 
  onSelectOption?: (index: number) => void; // 1, 2, 3, 4
  onExit?: () => void;           // Escape
  enabled?: boolean;
  showAnswer?: boolean;
}

export function useKeyboardShortcuts({
  onFlip,
  onCorrect,
  onIncorrect,
  onSelectOption,
  onExit,
  enabled = true,
  showAnswer = false,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Space':
          e.preventDefault();
          if (!showAnswer && onFlip) {
            onFlip();
          }
          break;

        case 'ArrowRight':
        case 'k':
        case 'K':
          e.preventDefault();
          if (showAnswer && onCorrect) {
            onCorrect();
          }
          break;

        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          if (showAnswer && onIncorrect) {
            onIncorrect();
          }
          break;

        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          if (onSelectOption) {
            onSelectOption(parseInt(e.key) - 1);
          }
          break;

        case 'Escape':
          e.preventDefault();
          if (onExit) {
            onExit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, showAnswer, onFlip, onCorrect, onIncorrect, onSelectOption, onExit]);
}
