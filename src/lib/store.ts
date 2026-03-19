import { create } from 'zustand';
import type { Exercise, Subject, Course, Pack } from './db';
import type { ExamMode } from './spaced-repetition';

export type ViewType = 'library' | 'review' | 'stats' | 'settings' | 'manage';

export type SoundName = 'correct' | 'incorrect' | 'streak' | 'session-complete' | 'level-up' | 'flip';

interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Hierarchy selection
  selectedSubjectId: number | null;
  setSelectedSubjectId: (id: number | null) => void;
  selectedCourseId: number | null;
  setSelectedCourseId: (id: number | null) => void;
  selectedPackId: number | null;
  setSelectedPackId: (id: number | null) => void;

  // Data
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  packs: Pack[];
  setPacks: (packs: Pack[]) => void;

  // Current context for review
  currentSubject: Subject | null;
  setCurrentSubject: (subject: Subject | null) => void;
  currentCourse: Course | null;
  setCurrentCourse: (course: Course | null) => void;
  currentPack: Pack | null;
  setCurrentPack: (pack: Pack | null) => void;

  // Review Session
  reviewQueue: Exercise[];
  setReviewQueue: (exercises: Exercise[]) => void;
  currentExerciseIndex: number;
  setCurrentExerciseIndex: (index: number) => void;
  currentExercise: Exercise | null;
  setCurrentExercise: (exercise: Exercise | null) => void;

  // Session Stats
  sessionCorrect: number;
  sessionIncorrect: number;
  sessionStartTime: Date | null;
  incrementCorrect: () => void;
  incrementIncorrect: () => void;
  startSession: () => void;
  endSession: () => void;

  // Settings
  examMode: ExamMode;
  setExamMode: (mode: ExamMode) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  reminderTime: string; // HH:mm format
  setReminderTime: (time: string) => void;

  // Cramming
  isCramming: boolean;
  setIsCramming: (cramming: boolean) => void;

  // Streak
  streak: number;
  setStreak: (streak: number) => void;

  // UI State
  certainty: number;
  setCertainty: (value: number) => void;
  showAnswer: boolean;
  setShowAnswer: (show: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  alertMessage: { type: 'illusion' | 'lucky' | 'success' | 'error'; message: string } | null;
  setAlertMessage: (alert: { type: 'illusion' | 'lucky' | 'success' | 'error'; message: string } | null) => void;

  // Reset
  resetSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'library',
  setCurrentView: (view) => set({ currentView: view }),

  // Hierarchy selection
  selectedSubjectId: null,
  setSelectedSubjectId: (id) => set({ selectedSubjectId: id, selectedCourseId: null, selectedPackId: null }),
  selectedCourseId: null,
  setSelectedCourseId: (id) => set({ selectedCourseId: id, selectedPackId: null }),
  selectedPackId: null,
  setSelectedPackId: (id) => set({ selectedPackId: id }),

  // Data
  subjects: [],
  setSubjects: (subjects) => set({ subjects }),
  courses: [],
  setCourses: (courses) => set({ courses }),
  packs: [],
  setPacks: (packs) => set({ packs }),

  // Current context
  currentSubject: null,
  setCurrentSubject: (subject) => set({ currentSubject: subject }),
  currentCourse: null,
  setCurrentCourse: (course) => set({ currentCourse: course }),
  currentPack: null,
  setCurrentPack: (pack) => set({ currentPack: pack }),

  // Review Session
  reviewQueue: [],
  setReviewQueue: (exercises) => set({ reviewQueue: exercises }),
  currentExerciseIndex: 0,
  setCurrentExerciseIndex: (index) => set({ currentExerciseIndex: index }),
  currentExercise: null,
  setCurrentExercise: (exercise) => set({ currentExercise: exercise }),

  // Session Stats
  sessionCorrect: 0,
  sessionIncorrect: 0,
  sessionStartTime: null,
  incrementCorrect: () => set((state) => ({ sessionCorrect: state.sessionCorrect + 1 })),
  incrementIncorrect: () => set((state) => ({ sessionIncorrect: state.sessionIncorrect + 1 })),
  startSession: () => set({ sessionStartTime: new Date(), sessionCorrect: 0, sessionIncorrect: 0 }),
  endSession: () => set({ sessionStartTime: null }),

  // Settings
  examMode: '1month',
  setExamMode: (mode) => set({ examMode: mode }),
  soundEnabled: true,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  notificationsEnabled: false,
  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  reminderTime: '19:00',
  setReminderTime: (time) => set({ reminderTime: time }),

  // Cramming
  isCramming: false,
  setIsCramming: (cramming) => set({ isCramming: cramming }),

  // Streak
  streak: 0,
  setStreak: (streak) => set({ streak }),

  // UI State
  certainty: 50,
  setCertainty: (value) => set({ certainty: value }),
  showAnswer: false,
  setShowAnswer: (show) => set({ showAnswer: show }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  alertMessage: null,
  setAlertMessage: (alert) => set({ alertMessage: alert }),

  // Reset
  resetSession: () => set({
    reviewQueue: [],
    currentExerciseIndex: 0,
    currentExercise: null,
    sessionCorrect: 0,
    sessionIncorrect: 0,
    sessionStartTime: null,
    certainty: 50,
    showAnswer: false,
    alertMessage: null,
    isCramming: false,
  }),
}));

// Selectors
export const selectCurrentProgress = (state: AppState) => {
  const total = state.reviewQueue.length;
  const current = state.currentExerciseIndex + 1;
  return { current, total, percentage: total > 0 ? (current / total) * 100 : 0 };
};

export const selectSessionStats = (state: AppState) => {
  const total = state.sessionCorrect + state.sessionIncorrect;
  const percentage = total > 0 ? (state.sessionCorrect / total) * 100 : 0;
  return {
    correct: state.sessionCorrect,
    incorrect: state.sessionIncorrect,
    total,
    percentage,
  };
};
