// User related types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  streak_count: number;
  last_study_date?: string;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  auto_play_audio: boolean;
  daily_goal: number;
  notification_enabled: boolean;
}

// Folder related types
export interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  user_id: string;
  schedule: StudySchedule;
  color?: string;
  created_at: string;
  updated_at: string;
  children?: Folder[];
  files?: FlashcardFile[];
}

// File related types
export interface FlashcardFile {
  id: string;
  name: string;
  folder_id: string;
  user_id: string;
  study_mode: StudyMode;
  schedule: StudySchedule;
  total_cards: number;
  new_cards: number;
  learning_cards: number;
  review_cards: number;
  created_at: string;
  updated_at: string;
  flashcards?: Flashcard[];
}

// Flashcard related types
export interface Flashcard {
  id: string;
  file_id: string;
  front: string; // 공부할 단어
  back: string; // 단어의 뜻
  notes?: string; // 예시문/메모 (선택)
  status: CardStatus;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: string;
  last_review?: string;
  created_at: string;
  updated_at: string;
  language?: string; // TTS를 위한 언어 코드
}

// Card status enum
export enum CardStatus {
  NEW = 'new',
  LEARNING = 'learning',
  REVIEW = 'review',
  SUSPENDED = 'suspended'
}

// Study mode types
export type StudyMode = 'bidirectional' | 'front-to-back' | 'back-to-front';

// Study schedule types (요일별 학습 스케줄)
export interface StudySchedule {
  enabled: boolean;
  days: DayOfWeek[];
  custom_schedule?: boolean;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Review result types (사용자 응답)
export type ReviewResult = 'again' | 'hard' | 'good' | 'easy';

// Study session types
export interface StudySession {
  id: string;
  user_id: string;
  file_id: string;
  cards_studied: number;
  correct_answers: number;
  study_duration: number; // in seconds
  session_date: string;
  created_at: string;
}

// Daily statistics
export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  cards_studied: number;
  new_cards_learned: number;
  review_cards_completed: number;
  study_time_minutes: number;
  completion_percentage: number;
  created_at: string;
}

// Today's study data
export interface TodaysStudy {
  folders_to_study: Folder[];
  files_to_study: FlashcardFile[];
  total_cards: number;
  completed_cards: number;
  completion_percentage: number;
  streak_count: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// TTS related types
export interface TTSRequest {
  text: string;
  language: string;
  voice?: string;
}

export interface TTSResponse {
  audio_url: string;
  duration: number;
}

// CSV import types
export interface CSVFlashcard {
  front: string;
  back: string;
  notes?: string;
  language?: string;
}

// Component prop types
export interface FlashcardComponentProps {
  flashcard: Flashcard;
  onReview: (result: ReviewResult) => void;
  onPlayAudio?: (text: string, language: string) => void;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export interface FolderTreeProps {
  folders: Folder[];
  onFolderSelect: (folder: Folder) => void;
  onFileSelect: (file: FlashcardFile) => void;
  selectedFolderId?: string;
  selectedFileId?: string;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

// Learning algorithm types (SM-2 기반)
export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

export interface ReviewCardData {
  cardId: string;
  result: ReviewResult;
  responseTime?: number;
}

// Progress tracking types
export interface StudyProgress {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  completedToday: number;
  streakDays: number;
  completionPercentage: number;
}