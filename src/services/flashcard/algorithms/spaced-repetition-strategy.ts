/**
 * Spaced Repetition Algorithm Strategy Interface
 * Defines the contract for all spaced repetition algorithms
 */

export type CardStatus = 'new' | 'learning' | 'review' | 'suspended';
export type UserResponse = 'again' | 'hard' | 'good' | 'easy';

export interface CardData {
  id: string;
  status: CardStatus;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: string;
  last_review: string | null;
  // Additional fields for algorithm flexibility
  algorithm_data?: Record<string, any>;
}

export interface CardUpdateResult {
  status: CardStatus;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: Date;
  graduated_today: boolean;
  algorithm_data?: Record<string, any>;
}

export interface AlgorithmConfig {
  [key: string]: any;
}

/**
 * Abstract base class for spaced repetition algorithms
 */
export abstract class SpacedRepetitionStrategy {
  protected config: AlgorithmConfig;

  constructor(config: AlgorithmConfig = {}) {
    this.config = config;
  }

  /**
   * Calculate next review based on user response
   */
  abstract calculateNextReview(
    card: CardData,
    response: UserResponse,
    currentTime?: Date
  ): CardUpdateResult;

  /**
   * Get algorithm name for identification
   */
  abstract getAlgorithmName(): string;

  /**
   * Get algorithm version for compatibility
   */
  abstract getVersion(): string;

  /**
   * Get default configuration for this algorithm
   */
  abstract getDefaultConfig(): AlgorithmConfig;

  /**
   * Validate card data for this algorithm
   */
  validateCard(card: CardData): boolean {
    return !!(
      card.id &&
      card.status &&
      typeof card.ease_factor === 'number' &&
      typeof card.interval === 'number' &&
      typeof card.repetitions === 'number' &&
      card.due_date
    );
  }

  /**
   * Initialize new card with algorithm-specific defaults
   */
  initializeNewCard(_cardId: string): Partial<CardData> {
    return {
      status: 'new',
      ease_factor: 2.5,
      interval: 1,
      repetitions: 0,
      due_date: new Date().toISOString(),
      last_review: null,
      algorithm_data: {},
    };
  }

  /**
   * Migrate card from another algorithm
   */
  migrateCard(card: CardData, fromAlgorithm: string): CardData {
    // Default migration - subclasses can override
    return {
      ...card,
      algorithm_data: {
        ...card.algorithm_data,
        migrated_from: fromAlgorithm,
        migrated_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Get cards due for review
   */
  getCardsForReview(cards: CardData[], currentTime: Date = new Date()): CardData[] {
    return cards.filter(card => {
      if (card.status === 'suspended') return false;
      const dueDate = new Date(card.due_date);
      return dueDate <= currentTime;
    });
  }

  /**
   * Sort cards by priority
   */
  sortCardsByPriority(cards: CardData[]): CardData[] {
    const statusPriority: Record<CardStatus, number> = {
      'new': 1,
      'learning': 2,
      'review': 3,
      'suspended': 4,
    };

    return [...cards].sort((a, b) => {
      // First by status priority
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then by due date (earlier first)
      const aDue = new Date(a.due_date).getTime();
      const bDue = new Date(b.due_date).getTime();
      return aDue - bDue;
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlgorithmConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AlgorithmConfig {
    return { ...this.config };
  }
}