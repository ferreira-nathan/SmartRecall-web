import type { Exercise } from './db';

export interface ReviewResult {
  quality: number; // 0-5
  certainty: number; // 0-100
  isCorrect: boolean;
}

export interface SM2Result {
  easiness: number;
  interval: number;
  nextReview: Date;
  stability: number;
}

export type ExamMode = '1day' | '1week' | '1month';

// FSRS-inspired Algorithm
export function calculateNextReview(
  card: Exercise,
  result: ReviewResult,
  examMode: ExamMode
): SM2Result {
  let { easiness, interval, stability } = card;
  const quality = result.quality;

  // 1. Illusion de compétence : Certainty > 80, mais faux
  if (result.certainty > 80 && !result.isCorrect) {
    return {
      easiness: Math.max(1.3, easiness - 0.5),
      interval: 0,
      nextReview: new Date(),
      stability: 0.1, // Reset stability strongly
    };
  }

  // 2. Coup de chance : Certainty < 30, mais juste
  if (result.certainty < 30 && result.isCorrect) {
    return {
      easiness,
      interval: 0,
      nextReview: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes (relearning phase)
      stability,
    };
  }

  // FSRS-inspired Logic
  // Convert easiness (1.3 to 5.0) to Difficulty D (1 to 10)
  let D = 11 - (easiness * 2);
  D = Math.max(1, Math.min(10, D));
  
  // Calculate elapsed time in days
  const now = Date.now();
  const lastReviewTime = card.lastReview ? new Date(card.lastReview).getTime() : new Date(card.createdAt).getTime();
  const elapsedDays = Math.max(0.01, (now - lastReviewTime) / (1000 * 60 * 60 * 24));

  // If first review, interval is 0
  if (interval === 0) {
    if (result.isCorrect) {
      interval = 1;
      stability = 1; // 1 day initial stability
      easiness = Math.max(1.3, easiness + (quality > 3 ? 0.1 : 0));
    } else {
      interval = 0;
      stability = 0.1;
      easiness = Math.max(1.3, easiness - 0.2);
    }
  } else {
    // Retrievability approximation: R = 0.9^(elapsedDays / stability)
    const R = Math.pow(0.9, elapsedDays / Math.max(0.1, stability));

    if (result.isCorrect) {
      // Stability increases more when R is low and D is low
      const stabilityMultiplier = 1 + Math.exp(1) * Math.pow(D, -0.5) * Math.pow(stability, -0.1) * Math.exp(1 - R);
      stability = stability * Math.max(1.1, stabilityMultiplier);
      
      // Update easiness based on quality
      easiness = Math.max(1.3, Math.min(5.0, easiness + 0.15 - (5 - quality) * 0.05));
      
      // Target interval for ~90% retention is the new stability
      interval = stability; 
    } else {
      // Forgetting: Stability drops significantly
      stability = Math.max(0.1, stability * Math.pow(D, -0.3) * 0.2);
      interval = 0;
      easiness = Math.max(1.3, easiness - 0.2);
    }
  }

  // Apply exam mode modifiers
  let intervalModifier = 1;
  switch (examMode) {
    case '1day': intervalModifier = 0.1; break; // Divide by 10
    case '1week': intervalModifier = 0.33; break; // Divide by 3
    case '1month': intervalModifier = 1; break; // Normal
  }

  const actualInterval = Math.max(0, Math.round(interval * intervalModifier));
  const nextReview = new Date();
  if (actualInterval === 0 && !result.isCorrect) {
    // If wrong, review in 10 minutes
    nextReview.setMinutes(nextReview.getMinutes() + 10);
  } else {
    nextReview.setDate(nextReview.getDate() + actualInterval);
  }

  return {
    easiness,
    interval: actualInterval,
    nextReview,
    stability,
  };
}

// Get cards due for review
export function getDueCards(cards: Exercise[]): Exercise[] {
  const now = new Date();
  return cards.filter(card => new Date(card.nextReview) <= now);
}

// Calculate card priority for review queue
export function calculatePriority(card: Exercise): number {
  const now = new Date();
  const nextReview = new Date(card.nextReview);
  const daysOverdue = Math.max(0, (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24));

  // Formula: Overdue ratio + inverse stability
  // Lower stability = higher priority, Overdue = much higher priority
  return (daysOverdue / Math.max(1, card.stability)) * 10 + (1 / Math.max(0.1, card.stability)) * 5;
}

// Sort cards by priority
export function sortCardsByPriority(cards: Exercise[]): Exercise[] {
  return cards.sort((a, b) => calculatePriority(b) - calculatePriority(a));
}

// Get statistics for a card
export function getCardStats(card: Exercise): {
  successRate: number;
  averageInterval: number;
  mastery: number;
} {
  const successRate = card.totalReviews > 0
    ? (card.correctReviews / card.totalReviews) * 100
    : 0;

  // FSRS Retrievability approximation
  const now = Date.now();
  const lastReviewTime = card.lastReview ? new Date(card.lastReview).getTime() : new Date(card.createdAt).getTime();
  const elapsedDays = Math.max(0, (now - lastReviewTime) / (1000 * 60 * 60 * 24));
  
  // Calculate R
  const R = card.stability > 0 ? Math.pow(0.9, elapsedDays / card.stability) : 0;
  
  // Mastery is based on finding the right balance between Retrievability and Stability
  // Highly stable card + high retrievability = 100% mastery
  const stabilityContrib = Math.min(100, (card.stability / 30) * 100); // Maxes out at 30 days stability
  const mastery = (R * 100 * 0.5) + (stabilityContrib * 0.5);

  return {
    successRate,
    averageInterval: card.interval,
    mastery: Math.min(100, Math.max(0, mastery)),
  };
}

// Check for illusion of competence
export function checkIllusionOfCompetence(
  certainty: number,
  isCorrect: boolean
): { isIllusion: boolean; message: string } {
  if (certainty > 80 && !isCorrect) {
    return {
      isIllusion: true,
      message: "ILLUSION DE COMPÉTENCE ! Tu étais très sûr de toi mais tu as eu faux. La carte est réinitialisée.",
    };
  }
  return { isIllusion: false, message: '' };
}

// Check for lucky guess
export function checkLuckyGuess(
  certainty: number,
  isCorrect: boolean
): { isLucky: boolean; message: string } {
  if (certainty < 30 && isCorrect) {
    return {
      isLucky: true,
      message: "Coup de chance ? Tu n'étais pas très sûr mais tu as eu juste. La carte sera revue plus tôt.",
    };
  }
  return { isLucky: false, message: '' };
}

// Calculate overall progress
export function calculateOverallProgress(cards: Exercise[]): {
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  averageMastery: number;
} {
  const totalCards = cards.length;
  const newCards = cards.filter(c => c.totalReviews === 0).length;
  // Mastered means high stability (e.g. at least 21 days)
  const masteredCards = cards.filter(c => c.stability >= 21).length; 
  const learningCards = totalCards - newCards - masteredCards;

  const averageMastery = cards.length > 0
    ? cards.reduce((sum, card) => sum + getCardStats(card).mastery, 0) / cards.length
    : 0;

  return {
    totalCards,
    masteredCards,
    learningCards,
    newCards,
    averageMastery,
  };
}
