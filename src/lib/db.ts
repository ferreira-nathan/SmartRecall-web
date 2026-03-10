import Dexie, { type EntityTable } from 'dexie';

// Types
export type ExerciseType = 'flashcard' | 'mcq' | 'trueFalse' | 'fillBlank' | 'timed';

// Subject (Matière) - ex: Mathématiques, Histoire, etc.
export interface Subject {
  id?: number;
  name: string;
  color: string; // Hex color for visual identification
  icon?: string; // Emoji or icon name
  createdAt: Date;
  updatedAt: Date;
}

// Course (Cours) - ex: Algèbre, Géométrie (sous une matière)
export interface Course {
  id?: number;
  subjectId: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pack (Pack de questions) - ex: Chapitre 1, Révision finale
export interface Pack {
  id?: number;
  courseId: number;
  name: string;
  description?: string;
  exerciseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Exercise (Exercice individuel)
export interface Exercise {
  id?: number;
  packId: number;
  type: ExerciseType;
  question: string;
  options?: string[]; // For MCQ
  answer: string;
  timing: number; // seconds suggested
  // Spaced repetition fields
  easiness: number;
  interval: number; // days
  nextReview: Date;
  stability: number;
  lastReview?: Date;
  totalReviews: number;
  correctReviews: number;
  streak: number;
  createdAt: Date;
}

// Review Statistics
export interface ReviewStat {
  id?: number;
  date: Date;
  subjectId?: number;
  courseId?: number;
  packId?: number;
  cardsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  duration: number; // seconds
}

// Settings
export interface Settings {
  id?: number;
  examMode: '1day' | '1week' | '1month';
}

// JSON Import Template Type
export interface ExerciseTemplate {
  id: string;
  type: ExerciseType;
  question: string;
  options?: string[];
  answer: string;
  timing?: number;
}

export interface PackImportJSON {
  name: string;
  description?: string;
  exercises: ExerciseTemplate[];
}

export interface CourseImportJSON {
  name: string;
  description?: string;
  packs: PackImportJSON[];
}

export interface FullImportJSON {
  subject?: {
    name: string;
    color?: string;
    icon?: string;
  };
  courses: CourseImportJSON[];
}

// Database
const db = new Dexie('SmartRecallDB') as Dexie & {
  subjects: EntityTable<Subject, 'id'>;
  courses: EntityTable<Course, 'id'>;
  packs: EntityTable<Pack, 'id'>;
  exercises: EntityTable<Exercise, 'id'>;
  reviewStats: EntityTable<ReviewStat, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(2).stores({
  subjects: '++id, name, createdAt',
  courses: '++id, subjectId, name, createdAt',
  packs: '++id, courseId, name, createdAt',
  exercises: '++id, packId, type, nextReview, createdAt',
  reviewStats: '++id, date, subjectId, courseId, packId',
  settings: '++id',
});

// ============ SUBJECT OPERATIONS ============

export async function addSubject(name: string, color: string = '#06b6d4', icon?: string): Promise<number> {
  const now = new Date();
  const id = await db.subjects.add({
    name,
    color,
    icon,
    createdAt: now,
    updatedAt: now,
  });
  return id as number;
}

export async function getSubjects(): Promise<Subject[]> {
  return db.subjects.orderBy('name').toArray();
}

export async function getSubject(id: number): Promise<Subject | undefined> {
  return db.subjects.get(id);
}

export async function updateSubject(id: number, updates: Partial<Subject>): Promise<void> {
  await db.subjects.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteSubject(id: number): Promise<void> {
  // Cascade delete: courses > packs > exercises
  const courses = await db.courses.where('subjectId').equals(id).toArray();
  for (const course of courses) {
    if (course.id) await deleteCourse(course.id);
  }
  await db.subjects.delete(id);
}

// ============ COURSE OPERATIONS ============

export async function addCourse(subjectId: number, name: string, description?: string): Promise<number> {
  const now = new Date();
  const id = await db.courses.add({
    subjectId,
    name,
    description,
    createdAt: now,
    updatedAt: now,
  });
  return id as number;
}

export async function getCourses(subjectId?: number): Promise<Course[]> {
  if (subjectId) {
    return db.courses.where('subjectId').equals(subjectId).toArray();
  }
  return db.courses.orderBy('name').toArray();
}

export async function getCourse(id: number): Promise<Course | undefined> {
  return db.courses.get(id);
}

export async function updateCourse(id: number, updates: Partial<Course>): Promise<void> {
  await db.courses.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteCourse(id: number): Promise<void> {
  // Cascade delete: packs > exercises
  const packs = await db.packs.where('courseId').equals(id).toArray();
  for (const pack of packs) {
    if (pack.id) await deletePack(pack.id);
  }
  await db.courses.delete(id);
}

// ============ PACK OPERATIONS ============

export async function addPack(courseId: number, name: string, description?: string): Promise<number> {
  const now = new Date();
  const id = await db.packs.add({
    courseId,
    name,
    description,
    exerciseCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id as number;
}

export async function getPacks(courseId?: number): Promise<Pack[]> {
  if (courseId) {
    return db.packs.where('courseId').equals(courseId).toArray();
  }
  return db.packs.orderBy('name').toArray();
}

export async function getPack(id: number): Promise<Pack | undefined> {
  return db.packs.get(id);
}

export async function updatePack(id: number, updates: Partial<Pack>): Promise<void> {
  await db.packs.update(id, { ...updates, updatedAt: new Date() });
}

export async function deletePack(id: number): Promise<void> {
  await db.exercises.where('packId').equals(id).delete();
  await db.packs.delete(id);
}

// ============ EXERCISE OPERATIONS ============

export async function addExercises(packId: number, exercises: Omit<ExerciseTemplate, 'id'>[]): Promise<void> {
  const now = new Date();
  const exerciseRecords: Exercise[] = exercises.map((ex) => ({
    packId,
    type: ex.type,
    question: ex.question,
    options: ex.options,
    answer: ex.answer,
    timing: ex.timing || 15,
    easiness: 2.5,
    interval: 0,
    nextReview: now,
    stability: 0.3,
    totalReviews: 0,
    correctReviews: 0,
    streak: 0,
    createdAt: now,
  }));

  await db.exercises.bulkAdd(exerciseRecords as any);
  await db.packs.update(packId, { exerciseCount: exercises.length, updatedAt: now });
}

export async function getExercises(packId: number): Promise<Exercise[]> {
  return db.exercises.where('packId').equals(packId).toArray();
}

export async function getExercise(id: number): Promise<Exercise | undefined> {
  return db.exercises.get(id);
}

export async function updateExercise(id: number, updates: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, updates);
}

// ============ IMPORT OPERATIONS ============

export async function importFromJSON(json: FullImportJSON, subjectId?: number): Promise<{ subjectId: number; coursesCreated: number; packsCreated: number; exercisesCreated: number }> {
  let currentSubjectId = subjectId;
  let coursesCreated = 0;
  let packsCreated = 0;
  let exercisesCreated = 0;

  // Create subject if provided
  if (json.subject && !subjectId) {
    currentSubjectId = await addSubject(
      json.subject.name,
      json.subject.color || '#06b6d4',
      json.subject.icon
    );
  } else if (!subjectId) {
    throw new Error('No subject ID provided and no subject in JSON');
  }

  // Import courses
  for (const courseData of json.courses) {
    const courseId = await addCourse(currentSubjectId!, courseData.name, courseData.description);
    coursesCreated++;

    // Import packs
    for (const packData of courseData.packs) {
      const packId = await addPack(courseId, packData.name, packData.description);
      packsCreated++;

      // Import exercises
      await addExercises(packId, packData.exercises);
      exercisesCreated += packData.exercises.length;
    }
  }

  return {
    subjectId: currentSubjectId!,
    coursesCreated,
    packsCreated,
    exercisesCreated,
  };
}

// ============ REVIEW OPERATIONS ============

export async function getDueExercises(packId?: number, courseId?: number, subjectId?: number): Promise<Exercise[]> {
  const now = new Date();
  
  if (packId) {
    return db.exercises.where('packId').equals(packId).and(ex => new Date(ex.nextReview) <= now).toArray();
  }

  if (courseId) {
    const packs = await db.packs.where('courseId').equals(courseId).toArray();
    const packIds = packs.map(p => p.id!);
    const exercises: Exercise[] = [];
    for (const id of packIds) {
      const packExercises = await db.exercises.where('packId').equals(id).and(ex => new Date(ex.nextReview) <= now).toArray();
      exercises.push(...packExercises);
    }
    return exercises;
  }

  if (subjectId) {
    const courses = await db.courses.where('subjectId').equals(subjectId).toArray();
    const exercises: Exercise[] = [];
    for (const course of courses) {
      const courseExercises = await getDueExercises(undefined, course.id);
      exercises.push(...courseExercises);
    }
    return exercises;
  }

  return db.exercises.where('nextReview').belowOrEqual(now).toArray();
}

export async function addReviewStat(stat: Omit<ReviewStat, 'id'>): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.reviewStats.add({ ...stat, date: today });
}

export async function getReviewStats(): Promise<ReviewStat[]> {
  return db.reviewStats.orderBy('date').toArray();
}

// ============ SETTINGS ============

export async function getSettings(): Promise<Settings> {
  const settings = await db.settings.toCollection().first();
  if (settings) return settings;
  return { id: 1, examMode: '1month' };
}

export async function updateSettings(updates: Partial<Settings>): Promise<void> {
  const existing = await db.settings.toCollection().first();
  if (existing) {
    await db.settings.update(existing.id, updates);
  } else {
    await db.settings.add({ id: 1, examMode: '1month', ...updates });
  }
}

// ============ STATISTICS ============

export async function getFullStats() {
  const subjects = await db.subjects.count();
  const courses = await db.courses.count();
  const packs = await db.packs.count();
  const exercises = await db.exercises.count();
  const totalReviews = (await db.exercises.toArray()).reduce((acc, ex) => acc + ex.totalReviews, 0);
  const correctReviews = (await db.exercises.toArray()).reduce((acc, ex) => acc + ex.correctReviews, 0);

  return {
    subjects,
    courses,
    packs,
    exercises,
    totalReviews,
    correctReviews,
    successRate: totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0,
  };
}

export { db };
