/**
 * Algorithms Index
 * Barrel export for all spaced repetition algorithms and related utilities
 */

// Base strategy interface and types
export {
  SpacedRepetitionStrategy,
  type CardData,
  type CardUpdateResult,
  type UserResponse,
  type CardStatus,
  type AlgorithmConfig,
} from './spaced-repetition-strategy';

// Factory pattern
export {
  AlgorithmFactory,
  getAlgorithmFactory,
  type AlgorithmType,
  type AlgorithmRegistry,
} from './algorithm-factory';

// Concrete algorithm implementations
export { AnkiSM2Strategy, type AnkiConfig, type AnkiLearningSteps } from './anki-sm2-strategy';
export { LeitnerStrategy, type LeitnerConfig } from './leitner-strategy';

// Re-export commonly used types for convenience
export type { UserResponse as AlgorithmResponse } from './spaced-repetition-strategy';