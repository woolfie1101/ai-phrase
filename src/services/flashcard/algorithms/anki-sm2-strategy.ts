/**
 * Anki SM-2 Algorithm Implementation
 * Implementation of the Anki spaced repetition algorithm following the Strategy pattern
 */

import {
  SpacedRepetitionStrategy,
  CardData,
  CardUpdateResult,
  UserResponse,
  AlgorithmConfig,
} from './spaced-repetition-strategy';

export interface AnkiLearningSteps {
  initial: number[]; // Steps in minutes for new cards
  relearning: number[]; // Steps in minutes for failed review cards
  graduating_interval: number; // Days for first review interval
  easy_interval: number; // Days for easy new cards
}

export interface AnkiConfig extends AlgorithmConfig {
  learning_steps: AnkiLearningSteps;
  max_ease_factor: number;
  min_ease_factor: number;
  ease_bonus: number; // Bonus for easy responses
  hard_multiplier: number; // Multiplier for hard responses
  new_interval_multiplier: number; // Multiplier for new intervals
}

const DEFAULT_ANKI_CONFIG: AnkiConfig = {
  learning_steps: {
    initial: [1, 10], // 1 minute, 10 minutes
    relearning: [10], // 10 minutes
    graduating_interval: 1, // 1 day
    easy_interval: 4, // 4 days
  },
  max_ease_factor: 2.5,
  min_ease_factor: 1.3,
  ease_bonus: 0.15,
  hard_multiplier: 1.2,
  new_interval_multiplier: 1.0,
};

/**
 * Anki SM-2 Algorithm Strategy Implementation
 */
export class AnkiSM2Strategy extends SpacedRepetitionStrategy {
  protected config: AnkiConfig;

  constructor(config: Partial<AnkiConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ANKI_CONFIG, ...config };
  }

  getAlgorithmName(): string {
    return 'anki-sm2';
  }

  getVersion(): string {
    return '2.1.0';
  }

  getDefaultConfig(): AnkiConfig {
    return DEFAULT_ANKI_CONFIG;
  }

  /**
   * Calculate next review based on user response
   */
  calculateNextReview(
    card: CardData,
    response: UserResponse,
    currentTime: Date = new Date()
  ): CardUpdateResult {
    if (!this.validateCard(card)) {
      throw new Error('Invalid card data');
    }

    const result: CardUpdateResult = {
      status: card.status,
      ease_factor: card.ease_factor,
      interval: card.interval,
      repetitions: card.repetitions,
      due_date: new Date(currentTime),
      graduated_today: false,
      algorithm_data: {
        algorithm_name: this.getAlgorithmName(),
        algorithm_version: this.getVersion(),
        last_response: response,
        response_time: currentTime.toISOString(),
        ...card.algorithm_data,
      },
    };

    switch (card.status) {
      case 'new':
        return this.handleNewCard(result, response, currentTime);
      case 'learning':
        return this.handleLearningCard(card, result, response, currentTime);
      case 'review':
        return this.handleReviewCard(card, result, response, currentTime);
      case 'suspended':
        // Suspended cards don't change
        return result;
      default:
        throw new Error(`Unknown card status: ${card.status}`);
    }
  }

  /**
   * Initialize new card with Anki-specific defaults
   */
  initializeNewCard(cardId: string): Partial<CardData> {
    return {
      ...super.initializeNewCard(cardId),
      algorithm_data: {
        algorithm_name: this.getAlgorithmName(),
        algorithm_version: this.getVersion(),
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Handle new card responses
   */
  private handleNewCard(
    result: CardUpdateResult,
    response: UserResponse,
    currentTime: Date
  ): CardUpdateResult {
    const steps = this.config.learning_steps;

    switch (response) {
      case 'again':
        result.status = 'learning';
        result.interval = steps.initial[0];
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'hard':
        result.status = 'learning';
        result.interval = steps.initial[0];
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'good':
        result.status = 'learning';
        result.interval = steps.initial[0];
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'easy':
        result.status = 'review';
        result.interval = steps.easy_interval;
        result.ease_factor = Math.min(
          result.ease_factor + this.config.ease_bonus,
          this.config.max_ease_factor
        );
        result.repetitions = 1;
        result.due_date = this.addDays(currentTime, result.interval);
        result.graduated_today = true;
        break;
    }

    return result;
  }

  /**
   * Handle learning card responses
   */
  private handleLearningCard(
    card: CardData,
    result: CardUpdateResult,
    response: UserResponse,
    currentTime: Date
  ): CardUpdateResult {
    const currentStepIndex = this.getCurrentLearningStepIndex(card.interval);
    const isRelearning = card.repetitions > 0;
    const steps = isRelearning
      ? this.config.learning_steps.relearning
      : this.config.learning_steps.initial;

    switch (response) {
      case 'again':
        // Reset to first learning step
        result.interval = steps[0];
        result.due_date = this.addMinutes(currentTime, result.interval);
        if (isRelearning) {
          result.ease_factor = Math.max(
            this.config.min_ease_factor,
            card.ease_factor - 0.2
          );
        }
        break;

      case 'hard':
        // Stay at current step or go to first step if not found
        const hardStepIndex = Math.max(0, currentStepIndex);
        result.interval = steps[hardStepIndex];
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'good':
        // Advance to next step or graduate
        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < steps.length) {
          // Move to next learning step
          result.interval = steps[nextStepIndex];
          result.due_date = this.addMinutes(currentTime, result.interval);
        } else {
          // Graduate to review
          result.status = 'review';
          result.interval = this.config.learning_steps.graduating_interval;
          result.repetitions = isRelearning ? card.repetitions : 1;
          result.due_date = this.addDays(currentTime, result.interval);
          result.graduated_today = true;
        }
        break;

      case 'easy':
        // Graduate immediately with longer interval
        result.status = 'review';
        result.interval = this.config.learning_steps.easy_interval;
        result.ease_factor = Math.min(
          result.ease_factor + this.config.ease_bonus,
          this.config.max_ease_factor
        );
        result.repetitions = isRelearning ? card.repetitions : 1;
        result.due_date = this.addDays(currentTime, result.interval);
        result.graduated_today = true;
        break;
    }

    return result;
  }

  /**
   * Handle review card responses using SM-2 algorithm
   */
  private handleReviewCard(
    card: CardData,
    result: CardUpdateResult,
    response: UserResponse,
    currentTime: Date
  ): CardUpdateResult {
    switch (response) {
      case 'again':
        // Failed review - go back to relearning
        result.status = 'learning';
        result.interval = this.config.learning_steps.relearning[0];
        result.ease_factor = Math.max(
          this.config.min_ease_factor,
          card.ease_factor - 0.2
        );
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'hard':
        // Reduce ease factor and use conservative multiplier
        result.ease_factor = Math.max(
          this.config.min_ease_factor,
          card.ease_factor - this.config.ease_bonus
        );
        result.interval = Math.max(
          1,
          Math.round(card.interval * this.config.hard_multiplier)
        );
        result.repetitions = card.repetitions + 1;
        result.due_date = this.addDays(currentTime, result.interval);
        break;

      case 'good':
        // Standard SM-2 calculation
        if (card.repetitions === 0) {
          result.interval = 1;
        } else if (card.repetitions === 1) {
          result.interval = 6;
        } else {
          result.interval = Math.round(
            card.interval * card.ease_factor * this.config.new_interval_multiplier
          );
        }
        result.repetitions = card.repetitions + 1;
        result.due_date = this.addDays(currentTime, result.interval);
        break;

      case 'easy':
        // Increase ease factor and use longer interval
        result.ease_factor = Math.min(
          this.config.max_ease_factor,
          card.ease_factor + this.config.ease_bonus
        );
        if (card.repetitions === 0) {
          result.interval = 4;
        } else {
          result.interval = Math.round(
            card.interval * card.ease_factor * 1.3 * this.config.new_interval_multiplier
          );
        }
        result.repetitions = card.repetitions + 1;
        result.due_date = this.addDays(currentTime, result.interval);
        break;
    }

    return result;
  }

  /**
   * Find current learning step index based on interval
   */
  private getCurrentLearningStepIndex(currentInterval: number): number {
    const allSteps = this.config.learning_steps.initial.concat(
      this.config.learning_steps.relearning
    );
    return allSteps.findIndex(step => step === currentInterval);
  }

  /**
   * Add minutes to a date
   */
  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  /**
   * Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Migrate card from another algorithm
   */
  migrateCard(card: CardData, fromAlgorithm: string): CardData {
    const migratedCard = super.migrateCard(card, fromAlgorithm);
    
    // Anki-specific migration logic
    if (fromAlgorithm === 'leitner') {
      // Convert Leitner box system to Anki intervals
      const leitnerBox = card.algorithm_data?.leitner_box || 1;
      migratedCard.interval = Math.max(1, Math.pow(2, leitnerBox - 1));
      migratedCard.ease_factor = 2.5; // Reset to default
    } else if (fromAlgorithm === 'simple-interval') {
      // Keep existing interval and ease factor
      migratedCard.ease_factor = Math.max(
        this.config.min_ease_factor,
        Math.min(this.config.max_ease_factor, card.ease_factor)
      );
    }
    
    migratedCard.algorithm_data = {
      ...migratedCard.algorithm_data,
      algorithm_name: this.getAlgorithmName(),
      algorithm_version: this.getVersion(),
    };
    
    return migratedCard;
  }
}