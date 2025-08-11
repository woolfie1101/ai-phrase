/**
 * Anki Spaced Repetition Algorithm Implementation
 * Based on SM-2 algorithm with modifications for optimal learning
 */

export type CardStatus = 'new' | 'learning' | 'review' | 'suspended';
export type UserResponse = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardData {
  id: string;
  status: CardStatus;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: string;
  last_review: string | null;
}

export interface CardUpdateResult {
  status: CardStatus;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: Date;
  graduated_today: boolean; // Whether card graduated from learning to review today
}

export interface LearningSteps {
  initial: number[]; // Steps in minutes for new cards
  relearning: number[]; // Steps in minutes for failed review cards
  graduating_interval: number; // Days for first review interval
  easy_interval: number; // Days for easy new cards
}

// Default Anki learning settings
export const DEFAULT_LEARNING_STEPS: LearningSteps = {
  initial: [1, 10], // 1 minute, 10 minutes
  relearning: [10], // 10 minutes
  graduating_interval: 1, // 1 day
  easy_interval: 4, // 4 days
};

/**
 * Core SM-2 algorithm implementation with Anki modifications
 */
export class AnkiAlgorithm {
  private learningSteps: LearningSteps;

  constructor(learningSteps: LearningSteps = DEFAULT_LEARNING_STEPS) {
    this.learningSteps = learningSteps;
  }

  /**
   * Calculate next review based on user response
   */
  calculateNextReview(
    card: FlashcardData,
    response: UserResponse,
    currentTime: Date = new Date()
  ): CardUpdateResult {
    const result: CardUpdateResult = {
      status: card.status,
      ease_factor: card.ease_factor,
      interval: card.interval,
      repetitions: card.repetitions,
      due_date: new Date(currentTime),
      graduated_today: false,
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
   * Handle new card responses
   */
  private handleNewCard(
    result: CardUpdateResult,
    response: UserResponse,
    currentTime: Date
  ): CardUpdateResult {
    switch (response) {
      case 'again':
        result.status = 'learning';
        result.interval = this.learningSteps.initial[0]; // First learning step
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'hard':
        result.status = 'learning';
        result.interval = this.learningSteps.initial[0]; // First learning step
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'good':
        result.status = 'learning';
        result.interval = this.learningSteps.initial[0]; // First learning step
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'easy':
        result.status = 'review';
        result.interval = this.learningSteps.easy_interval;
        result.ease_factor = Math.min(result.ease_factor + 0.15, 2.5);
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
    card: FlashcardData,
    result: CardUpdateResult,
    response: UserResponse,
    currentTime: Date
  ): CardUpdateResult {
    const currentStepIndex = this.getCurrentLearningStepIndex(card.interval);
    const isRelearning = card.repetitions > 0; // If card has been in review before
    const steps = isRelearning ? this.learningSteps.relearning : this.learningSteps.initial;

    switch (response) {
      case 'again':
        // Reset to first learning step
        result.interval = steps[0];
        result.due_date = this.addMinutes(currentTime, result.interval);
        if (isRelearning) {
          result.ease_factor = Math.max(1.3, card.ease_factor - 0.2);
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
          result.interval = this.learningSteps.graduating_interval;
          result.repetitions = isRelearning ? card.repetitions : 1;
          result.due_date = this.addDays(currentTime, result.interval);
          result.graduated_today = true;
        }
        break;

      case 'easy':
        // Graduate immediately with longer interval
        result.status = 'review';
        result.interval = this.learningSteps.easy_interval;
        result.ease_factor = Math.min(result.ease_factor + 0.15, 2.5);
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
    card: FlashcardData,
    result: CardUpdateResult,
    response: UserResponse,
    currentTime: Date
  ): CardUpdateResult {
    switch (response) {
      case 'again':
        // Failed review - go back to relearning
        result.status = 'learning';
        result.interval = this.learningSteps.relearning[0];
        result.ease_factor = Math.max(1.3, card.ease_factor - 0.2);
        result.due_date = this.addMinutes(currentTime, result.interval);
        break;

      case 'hard':
        // Reduce ease factor and use conservative multiplier
        result.ease_factor = Math.max(1.3, card.ease_factor - 0.15);
        result.interval = Math.max(1, Math.round(card.interval * 1.2));
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
          result.interval = Math.round(card.interval * card.ease_factor);
        }
        result.repetitions = card.repetitions + 1;
        result.due_date = this.addDays(currentTime, result.interval);
        break;

      case 'easy':
        // Increase ease factor and use longer interval
        result.ease_factor = Math.min(2.5, card.ease_factor + 0.15);
        if (card.repetitions === 0) {
          result.interval = 4;
        } else {
          result.interval = Math.round(card.interval * card.ease_factor * 1.3);
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
    const steps = this.learningSteps.initial.concat(this.learningSteps.relearning);
    return steps.findIndex(step => step === currentInterval);
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
   * Get cards due for review (due_date <= current time)
   */
  static getCardsForReview(cards: FlashcardData[], currentTime: Date = new Date()): FlashcardData[] {
    return cards.filter(card => {
      if (card.status === 'suspended') return false;
      const dueDate = new Date(card.due_date);
      return dueDate <= currentTime;
    });
  }

  /**
   * Sort cards by priority: new -> learning -> review, then by due date
   */
  static sortCardsByPriority(cards: FlashcardData[]): FlashcardData[] {
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
   * Calculate interval modifier based on card history
   */
  static calculateIntervalModifier(repetitions: number, ease_factor: number): number {
    // Gradually reduce interval modifier for cards with low ease factors
    if (ease_factor < 2.0) {
      return 0.8;
    } else if (ease_factor < 2.2) {
      return 0.9;
    }
    return 1.0;
  }
}