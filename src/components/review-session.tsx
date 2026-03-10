'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useCallback } from 'react';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Sparkles, 
  ChevronLeft
} from 'lucide-react';
import { useAppStore, selectCurrentProgress, selectSessionStats } from '@/lib/store';
import { updateExercise, addReviewStat } from '@/lib/db';
import { 
  calculateNextReview, 
  checkIllusionOfCompetence, 
  checkLuckyGuess,
  type ReviewResult 
} from '@/lib/spaced-repetition';
import { CertaintySlider } from './certainty-slider';
import { Flashcard } from './exercises/flashcard';
import { MCQ } from './exercises/mcq';
import { TrueFalse } from './exercises/true-false';
import { Timed } from './exercises/timed';
import { FillBlanks } from './exercises/fill-blanks';

export function ReviewSession() {
  const {
    reviewQueue,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    currentExercise,
    setCurrentExercise,
    sessionCorrect,
    sessionIncorrect,
    incrementCorrect,
    incrementIncorrect,
    sessionStartTime,
    startSession,
    examMode,
    certainty,
    showAnswer,
    setShowAnswer,
    setCertainty,
    alertMessage,
    setAlertMessage,
    setCurrentView,
    currentSubject,
    currentCourse,
    currentPack,
    resetSession,
  } = useAppStore();

  const progress = selectCurrentProgress(useAppStore.getState());
  const sessionStats = selectSessionStats(useAppStore.getState());

  // Initialize first exercise
  useEffect(() => {
    if (reviewQueue.length > 0 && !currentExercise) {
      setCurrentExercise(reviewQueue[0]);
      setCurrentExerciseIndex(0);
      startSession();
    }
  }, [reviewQueue, currentExercise, setCurrentExercise, setCurrentExerciseIndex, startSession]);

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    if (!currentExercise) return;

    // Update stats
    if (isCorrect) {
      incrementCorrect();
    } else {
      incrementIncorrect();
    }

    // Check for illusion or lucky guess
    const illusion = checkIllusionOfCompetence(certainty, isCorrect);
    const lucky = checkLuckyGuess(certainty, isCorrect);

    if (illusion.isIllusion) {
      setAlertMessage({ type: 'illusion', message: illusion.message });
    } else if (lucky.isLucky) {
      setAlertMessage({ type: 'lucky', message: lucky.message });
    }

    // Calculate SM-2 result
    const quality = isCorrect 
      ? (certainty > 80 ? 5 : certainty > 60 ? 4 : 3)
      : (certainty < 30 ? 0 : certainty < 60 ? 2 : 1);

    const reviewResult: ReviewResult = {
      quality,
      certainty,
      isCorrect,
    };

    const sm2Result = calculateNextReview(currentExercise, reviewResult, examMode);

    // Update exercise in database
    await updateExercise(currentExercise.id!, {
      ...sm2Result,
      lastReview: new Date(),
      totalReviews: currentExercise.totalReviews + 1,
      correctReviews: currentExercise.correctReviews + (isCorrect ? 1 : 0),
      streak: isCorrect ? currentExercise.streak + 1 : 0,
    });

    // Wait for alert display then move to next
    setTimeout(() => {
      moveToNext();
    }, illusion.isIllusion || lucky.isLucky ? 2500 : 1000);
  }, [currentExercise, certainty, examMode, incrementCorrect, incrementIncorrect, setAlertMessage]);

  const moveToNext = useCallback(() => {
    const nextIndex = currentExerciseIndex + 1;

    if (nextIndex >= reviewQueue.length) {
      // Session complete
      endSession();
    } else {
      setCurrentExerciseIndex(nextIndex);
      setCurrentExercise(reviewQueue[nextIndex]);
      setShowAnswer(false);
      setCertainty(50);
      setAlertMessage(null);
    }
  }, [currentExerciseIndex, reviewQueue, setCurrentExerciseIndex, setCurrentExercise, setShowAnswer, setCertainty, setAlertMessage]);

  const endSession = useCallback(async () => {
    // Save session stats
    if (sessionStartTime) {
      const duration = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
      await addReviewStat({
        date: new Date(),
        subjectId: currentSubject?.id,
        courseId: currentCourse?.id,
        packId: currentPack?.id,
        cardsReviewed: sessionCorrect + sessionIncorrect,
        correctCount: sessionCorrect,
        incorrectCount: sessionIncorrect,
        duration,
      });
    }

    resetSession();
    setCurrentView('library');
  }, [sessionStartTime, sessionCorrect, sessionIncorrect, currentSubject, currentCourse, currentPack, resetSession, setCurrentView]);

  const handleExit = useCallback(() => {
    if (confirm('Quitter la session ? Ta progression sera sauvegardée.')) {
      endSession();
    }
  }, [endSession]);

  const handleShowAnswer = useCallback(() => {
    setShowAnswer(true);
  }, [setShowAnswer]);

  const getContextName = () => {
    if (currentPack) return currentPack.name;
    if (currentCourse) return currentCourse.name;
    if (currentSubject) return currentSubject.name;
    return 'Session de révision';
  };

  if (!currentExercise) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderExercise = () => {
    const props = {
      exercise: currentExercise,
      onAnswer: handleAnswer,
      showAnswer,
      onShowAnswer: handleShowAnswer,
    };

    switch (currentExercise.type) {
      case 'flashcard':
        return <Flashcard {...props} />;
      case 'mcq':
        return <MCQ {...props} />;
      case 'trueFalse':
        return <TrueFalse {...props} />;
      case 'timed':
        return <Timed {...props} />;
      case 'fillBlank':
        return <FillBlanks {...props} />;
      default:
        return <Flashcard {...props} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExit}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h2 className="text-lg font-medium text-zinc-200">
                {getContextName()}
              </h2>
              <p className="text-sm text-zinc-500">
                Carte {progress.current} sur {progress.total}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">{sessionCorrect}</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{sessionIncorrect}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        {/* Certainty Slider */}
        {!showAnswer && currentExercise.type !== 'mcq' && currentExercise.type !== 'trueFalse' && currentExercise.type !== 'timed' && (
          <CertaintySlider />
        )}

        {/* Exercise */}
        <motion.div
          key={currentExercise.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="w-full max-w-2xl"
        >
          {renderExercise()}
        </motion.div>

        {/* Alert Messages */}
        <AnimatePresence>
          {alertMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`mt-6 p-4 rounded-xl border max-w-md ${
                alertMessage.type === 'illusion'
                  ? 'bg-pink-500/20 border-pink-500/50'
                  : alertMessage.type === 'lucky'
                    ? 'bg-yellow-500/20 border-yellow-500/50'
                    : 'bg-cyan-500/20 border-cyan-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {alertMessage.type === 'illusion' && (
                  <AlertTriangle className="w-6 h-6 text-pink-400 shrink-0" />
                )}
                {alertMessage.type === 'lucky' && (
                  <Sparkles className="w-6 h-6 text-yellow-400 shrink-0" />
                )}
                <p className={`text-sm font-medium ${
                  alertMessage.type === 'illusion' ? 'text-pink-300' : 'text-yellow-300'
                }`}>
                  {alertMessage.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session Complete Check */}
      {progress.current >= progress.total && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-zinc-950/90 flex items-center justify-center z-50"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Session terminée !
            </h2>
            <p className="text-zinc-400 mb-4">
              {sessionStats.correct} / {sessionStats.total} correctes ({sessionStats.percentage.toFixed(0)}%)
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={endSession}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium"
            >
              Terminer
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
