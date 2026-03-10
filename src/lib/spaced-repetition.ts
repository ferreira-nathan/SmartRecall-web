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

// SM-2 Algorithm with modifications
export function calculateNextReview(
  card: Exercise,
  result: ReviewResult,
  examMode: ExamMode
): SM2Result {
  let { easiness, interval, stability } = card;

  // Calculate quality based on correctness and certainty
  let quality = result.quality;

  // ILLUSION DE COMPÉTENCE: High certainty but wrong answer
  if (result.certainty > 80 && !result.isCorrect) {
    // Reset completely - this is a dangerous illusion
    return {
      easiness: Math.max(1.3, easiness - 0.5),
      interval: 0,
      nextReview: new Date(),
      stability: 0.3,
    };
  }

  // COUP DE CHANCE: Low certainty but correct answer
  if (result.certainty < 30 && result.isCorrect) {
    // Don't increase interval - likely a lucky guess
    return {
      easiness,
      interval: 0, // Review again soon
      nextReview: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      stability,
    };
  }

  // Standard SM-2 calculation
  if (result.isCorrect) {
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
  } else {
    // Failed - reset interval but keep some progress
    interval = 0;
    easiness = Math.max(1.3, easiness - 0.2);
  }

  // Update easiness factor based on quality
  easiness = Math.max(
    1.3,
    easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Update stability
  if (result.isCorrect) {
    stability = Math.min(1, stability + 0.1);
  } else {
    stability = Math.max(0.1, stability - 0.1);
  }

  // Apply exam mode modifier
  let intervalModifier = 1;
  switch (examMode) {
    case '1day':
      intervalModifier = 0.1; // Divide by 10
      break;
    case '1week':
      intervalModifier = 0.33; // Divide by 3
      break;
    case '1month':
      intervalModifier = 1; // Normal
      break;
  }

  interval = Math.max(0, Math.round(interval * intervalModifier));

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easiness,
    interval,
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
  const daysOverdue = (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24);

  // Higher priority for more overdue cards and lower stability
  return daysOverdue * 10 + (1 - card.stability) * 5;
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

  const mastery = Math.min(100,
    (card.interval / 30) * 50 + // Interval contribution
    successRate * 0.3 + // Success rate contribution
    card.stability * 20 // Stability contribution
  );

  return {
    successRate,
    averageInterval: card.interval,
    mastery,
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
      message: "ILLUSION DE COMPÉTENCE ! Tu étais très sûr de toi mais tu as eu faux. Cette carte est réinitialisée.",
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
      message: "Coup de chance ? Tu n'étais pas très sûr mais tu as eu juste. Révise à nouveau !",
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
  const masteredCards = cards.filter(c => c.interval >= 21 && c.stability >= 0.8).length;
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
