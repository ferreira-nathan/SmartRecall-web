import Dexie, { type EntityTable } from 'dexie';

// Types
export type ExerciseType = 'flashcard' | 'mcq' | 'truefalse' | 'fillblank';

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  options?: string[];
  answer: string;
  timing: number; // suggested time in seconds
}

export interface Document {
  id: string;
  name: string;
  pdfData: string; // base64 encoded PDF
  createdAt: Date;
  exercises: Exercise[];
}

export interface ExerciseCard {
  id: string;
  documentId: string;
  type: ExerciseType;
  question: string;
  options?: string[];
  answer: string;
  timing: number;
  // SM-2 Algorithm fields
  easiness: number; // default 2.5
  interval: number; // days
  nextReview: Date;
  stability: number;
  lastReview?: Date;
  totalReviews: number;
  correctReviews: number;
  streak: number;
  // Certainty tracking
  lastCertainty?: number;
  illusionCount: number; // times user was confident but wrong
  luckyCount: number; // times user was unsure but correct
}

export interface ReviewStats {
  id: string;
  date: Date;
  cardsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  duration: number; // in seconds
  illusionCount: number;
  luckyCount: number;
}

export interface Settings {
  id: string;
  examMode: '1day' | '1week' | '1month';
  darkMode: boolean;
}

// Database class
const db = new Dexie('SmartRecallDB') as Dexie & {
  documents: EntityTable<Document, 'id'>;
  exerciseCards: EntityTable<ExerciseCard, 'id'>;
  reviewStats: EntityTable<ReviewStats, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

// Schema
db.version(1).stores({
  documents: 'id, name, createdAt',
  exerciseCards: 'id, documentId, nextReview, type',
  reviewStats: 'id, date',
  settings: 'id'
});

// Helper functions
export async function initializeSettings() {
  const existing = await db.settings.get('main');
  if (!existing) {
    await db.settings.add({
      id: 'main',
      examMode: '1month',
      darkMode: true
    });
  }
  return db.settings.get('main');
}

export async function getSettings() {
  return db.settings.get('main');
}

export async function updateSettings(settings: Partial<Settings>) {
  return db.settings.update('main', settings);
}

// Document operations
export async function saveDocument(doc: Document) {
  return db.documents.add(doc);
}

export async function getDocuments() {
  return db.documents.orderBy('createdAt').reverse().toArray();
}

export async function getDocument(id: string) {
  return db.documents.get(id);
}

export async function deleteDocument(id: string) {
  await db.exerciseCards.where('documentId').equals(id).delete();
  return db.documents.delete(id);
}

// Exercise card operations
export async function saveExerciseCards(cards: ExerciseCard[]) {
  return db.exerciseCards.bulkAdd(cards);
}

export async function getExerciseCards(documentId: string) {
  return db.exerciseCards.where('documentId').equals(documentId).toArray();
}

export async function getDueCards(limit?: number) {
  const now = new Date();
  let query = db.exerciseCards.where('nextReview').belowOrEqual(now);
  const cards = await query.toArray();
  return limit ? cards.slice(0, limit) : cards;
}

export async function updateExerciseCard(id: string, updates: Partial<ExerciseCard>) {
  return db.exerciseCards.update(id, updates);
}

// Review stats operations
export async function saveReviewStats(stats: ReviewStats) {
  return db.reviewStats.add(stats);
}

export async function getReviewStats(days?: number) {
  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return db.reviewStats.where('date').aboveOrEqual(startDate).toArray();
  }
  return db.reviewStats.orderBy('date').reverse().toArray();
}

export async function getTodayStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stats = await db.reviewStats.where('date').aboveOrEqual(today).toArray();
  return stats[0];
}

export async function updateTodayStats(updates: Partial<ReviewStats>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existing = await getTodayStats();
  if (existing) {
    return db.reviewStats.update(existing.id, {
      ...updates,
      cardsReviewed: (existing.cardsReviewed || 0) + (updates.cardsReviewed || 0),
      correctCount: (existing.correctCount || 0) + (updates.correctCount || 0),
      incorrectCount: (existing.incorrectCount || 0) + (updates.incorrectCount || 0),
      duration: (existing.duration || 0) + (updates.duration || 0),
      illusionCount: (existing.illusionCount || 0) + (updates.illusionCount || 0),
      luckyCount: (existing.luckyCount || 0) + (updates.luckyCount || 0),
    });
  } else {
    return saveReviewStats({
      id: crypto.randomUUID(),
      date: today,
      cardsReviewed: updates.cardsReviewed || 0,
      correctCount: updates.correctCount || 0,
      incorrectCount: updates.incorrectCount || 0,
      duration: updates.duration || 0,
      illusionCount: updates.illusionCount || 0,
      luckyCount: updates.luckyCount || 0,
    });
  }
}

// Statistics helpers
export async function getHeatmapData(year?: number) {
  const currentYear = year || new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31);
  
  const stats = await db.reviewStats.where('date').between(startDate, endDate).toArray();
  
  // Create a map of date string to stats
  const heatmapData: Record<string, { cards: number; correct: number }> = {};
  
  for (const stat of stats) {
    const dateStr = new Date(stat.date).toISOString().split('T')[0];
    if (!heatmapData[dateStr]) {
      heatmapData[dateStr] = { cards: 0, correct: 0 };
    }
    heatmapData[dateStr].cards += stat.cardsReviewed;
    heatmapData[dateStr].correct += stat.correctCount;
  }
  
  return heatmapData;
}

export async function getOverallStats() {
  const allStats = await db.reviewStats.toArray();
  const allCards = await db.exerciseCards.toArray();
  
  const totalCards = allCards.length;
  const totalReviews = allStats.reduce((sum, s) => sum + s.cardsReviewed, 0);
  const correctReviews = allStats.reduce((sum, s) => sum + s.correctCount, 0);
  const incorrectReviews = allStats.reduce((sum, s) => sum + s.incorrectCount, 0);
  const totalIllusions = allStats.reduce((sum, s) => sum + s.illusionCount, 0);
  const totalLucky = allStats.reduce((sum, s) => sum + s.luckyCount, 0);
  const totalDuration = allStats.reduce((sum, s) => sum + s.duration, 0);
  
  // Calculate current streak
  const sortedStats = [...allStats].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < sortedStats.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    const stat = sortedStats.find(s => {
      const statDate = new Date(s.date);
      statDate.setHours(0, 0, 0, 0);
      return statDate.getTime() === expectedDate.getTime();
    });
    
    if (stat && stat.cardsReviewed > 0) {
      streak++;
    } else if (i === 0) {
      // Allow today to be empty
      continue;
    } else {
      break;
    }
  }
  
  return {
    totalCards,
    totalReviews,
    correctReviews,
    incorrectReviews,
    successRate: totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0,
    totalIllusions,
    totalLucky,
    totalDuration,
    streak,
    averageEasiness: allCards.length > 0 
      ? allCards.reduce((sum, c) => sum + c.easiness, 0) / allCards.length 
      : 2.5
  };
}

export { db };
