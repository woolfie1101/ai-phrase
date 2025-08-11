/**
 * Flashcard Service Barrel Export
 * Main entry point for all flashcard learning functionality
 */

// Strategy Pattern Algorithms (NEW - Recommended)
export * from './algorithms';

// V2 Service with Strategy Pattern Support (NEW - Recommended)
export { CardServiceV2, type AlgorithmSettings, type StudyModeConfig as StudyModeConfigV2, type FileStudyStats as FileStudyStatsV2 } from './card-service-v2';

// Legacy Core algorithm (DEPRECATED - Use algorithms/anki-sm2-strategy instead)
export { AnkiAlgorithm, type FlashcardData, type CardUpdateResult, type UserResponse, type LearningSteps, DEFAULT_LEARNING_STEPS } from './anki-algorithm';

// Learning session management (compatible with both V1 and V2)
export { LearningSession, type SessionCard, type LearningSessionConfig, type SessionStats, type CardReview } from './learning-session';

// Queue management (compatible with both V1 and V2)
export { QueueManager, type QueueConfig, type DailyQueue, type CardCounts } from './queue-manager';

// Legacy high-level service API (DEPRECATED - Use CardServiceV2 instead)
export { CardService, type StudyModeConfig, type FileStudyStats } from './card-service';

// Re-export card status type for convenience
export type CardStatus = 'new' | 'learning' | 'review' | 'suspended';