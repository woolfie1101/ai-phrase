/**
 * Leitner System Algorithm Implementation
 * Implementation of the Leitner spaced repetition system following the Strategy pattern
 */

import {
  SpacedRepetitionStrategy,
  CardData,
  CardUpdateResult,
  UserResponse,
  AlgorithmConfig,
} from './spaced-repetition-strategy';

export interface LeitnerConfig extends AlgorithmConfig {
  box_count: number; // Number of boxes (typically 5-7)
  box_intervals: number[]; // Review intervals for each box in days
  promote_on_success: boolean; // Promote to next box on correct answer
  demote_on_failure: boolean; // Demote to box 1 on incorrect answer
  graduated_box: number; // Box number considered "graduated"
}

const DEFAULT_LEITNER_CONFIG: LeitnerConfig = {
  box_count: 5,
  box_intervals: [1, 3, 7, 14, 30], // Days for boxes 1-5
  promote_on_success: true,
  demote_on_failure: true,
  graduated_box: 4, // Box 4 and above are considered graduated
};

/**
 * Leitner System Strategy Implementation
 * Simple but effective spaced repetition using boxes
 */
export class LeitnerStrategy extends SpacedRepetitionStrategy {
  protected config: LeitnerConfig;

  constructor(config: Partial<LeitnerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_LEITNER_CONFIG, ...config };
    
    // Validate configuration
    if (this.config.box_intervals.length !== this.config.box_count) {
      throw new Error('Box intervals length must match box count');
    }
  }

  getAlgorithmName(): string {
    return 'leitner';
  }

  getVersion(): string {
    return '1.0.0';
  }

  getDefaultConfig(): LeitnerConfig {
    return DEFAULT_LEITNER_CONFIG;
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

    const currentBox = this.getCurrentBox(card);
    const nextBox = this.calculateNextBox(currentBox, response);
    const nextInterval = this.config.box_intervals[nextBox - 1];
    const nextStatus = this.calculateStatus(nextBox);

    const result: CardUpdateResult = {
      status: nextStatus,
      ease_factor: 2.5, // Leitner doesn't use ease factor, but we keep it for compatibility
      interval: nextInterval,
      repetitions: card.repetitions + 1,
      due_date: this.addDays(currentTime, nextInterval),
      graduated_today: currentBox < this.config.graduated_box && nextBox >= this.config.graduated_box,
      algorithm_data: {
        algorithm_name: this.getAlgorithmName(),
        algorithm_version: this.getVersion(),
        leitner_box: nextBox,
        previous_box: currentBox,
        last_response: response,
        response_time: currentTime.toISOString(),
        success_count: this.updateSuccessCount(card, response),
        failure_count: this.updateFailureCount(card, response),
        ...card.algorithm_data,
      },
    };

    return result;
  }

  /**
   * Initialize new card with Leitner-specific defaults
   */
  initializeNewCard(cardId: string): Partial<CardData> {
    return {
      ...super.initializeNewCard(cardId),
      interval: this.config.box_intervals[0], // Box 1 interval
      algorithm_data: {
        algorithm_name: this.getAlgorithmName(),
        algorithm_version: this.getVersion(),
        leitner_box: 1,
        success_count: 0,
        failure_count: 0,
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Get current Leitner box for a card
   */
  private getCurrentBox(card: CardData): number {
    const box = card.algorithm_data?.leitner_box;
    if (typeof box === 'number' && box >= 1 && box <= this.config.box_count) {
      return box;
    }
    
    // Fallback: determine box from interval
    const interval = card.interval;
    for (let i = 0; i < this.config.box_intervals.length; i++) {
      if (interval <= this.config.box_intervals[i]) {
        return i + 1;
      }
    }
    
    return 1; // Default to box 1
  }

  /**
   * Calculate next box based on current box and user response
   */
  private calculateNextBox(currentBox: number, response: UserResponse): number {
    const isCorrect = response === 'good' || response === 'easy';
    const isIncorrect = response === 'again';
    
    if (isCorrect && this.config.promote_on_success) {
      // Promote to next box (max: box_count)
      if (response === 'easy') {
        // Easy response might skip a box
        return Math.min(currentBox + 2, this.config.box_count);
      } else {
        return Math.min(currentBox + 1, this.config.box_count);
      }
    } else if (isIncorrect && this.config.demote_on_failure) {
      // Demote to box 1
      return 1;
    } else if (response === 'hard') {
      // Hard response stays in same box or goes back one
      return Math.max(1, currentBox - 1);
    }
    
    // No change for other cases
    return currentBox;
  }

  /**
   * Calculate card status based on box
   */
  private calculateStatus(box: number): 'new' | 'learning' | 'review' | 'suspended' {
    if (box === 1) {
      return 'new';
    } else if (box < this.config.graduated_box) {
      return 'learning';
    } else {
      return 'review';
    }
  }

  /**
   * Update success count
   */
  private updateSuccessCount(card: CardData, response: UserResponse): number {
    const currentCount = card.algorithm_data?.success_count || 0;
    const isSuccess = response === 'good' || response === 'easy';
    return isSuccess ? currentCount + 1 : currentCount;
  }

  /**
   * Update failure count
   */
  private updateFailureCount(card: CardData, response: UserResponse): number {
    const currentCount = card.algorithm_data?.failure_count || 0;
    const isFailure = response === 'again';
    return isFailure ? currentCount + 1 : currentCount;
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
   * Sort cards by Leitner box priority (box 1 first, then by due date)
   */
  sortCardsByPriority(cards: CardData[]): CardData[] {
    return [...cards].sort((a, b) => {
      // Filter out suspended cards first
      if (a.status === 'suspended' && b.status !== 'suspended') return 1;
      if (b.status === 'suspended' && a.status !== 'suspended') return -1;
      if (a.status === 'suspended' && b.status === 'suspended') return 0;

      const boxA = this.getCurrentBox(a);
      const boxB = this.getCurrentBox(b);
      
      // Lower boxes have higher priority
      if (boxA !== boxB) {
        return boxA - boxB;
      }
      
      // Same box: sort by due date
      const aDue = new Date(a.due_date).getTime();
      const bDue = new Date(b.due_date).getTime();
      return aDue - bDue;
    });
  }

  /**
   * Get box distribution for analytics
   */
  getBoxDistribution(cards: CardData[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    // Initialize all boxes
    for (let i = 1; i <= this.config.box_count; i++) {
      distribution[i] = 0;
    }
    
    // Count cards in each box
    cards.forEach(card => {
      if (card.status !== 'suspended') {
        const box = this.getCurrentBox(card);
        distribution[box] = (distribution[box] || 0) + 1;
      }
    });
    
    return distribution;
  }

  /**
   * Migrate card from another algorithm
   */
  migrateCard(card: CardData, fromAlgorithm: string): CardData {
    const migratedCard = super.migrateCard(card, fromAlgorithm);
    
    // Leitner-specific migration logic
    let targetBox = 1;
    
    if (fromAlgorithm === 'anki-sm2') {
      // Convert Anki repetitions to Leitner box
      if (card.repetitions === 0) {
        targetBox = 1;
      } else if (card.repetitions <= 2) {
        targetBox = 2;
      } else if (card.repetitions <= 5) {
        targetBox = 3;
      } else if (card.repetitions <= 10) {
        targetBox = 4;
      } else {
        targetBox = 5;
      }
      
      // Also consider interval
      const interval = card.interval;
      if (interval >= 30) targetBox = Math.max(targetBox, 5);
      else if (interval >= 14) targetBox = Math.max(targetBox, 4);
      else if (interval >= 7) targetBox = Math.max(targetBox, 3);
      else if (interval >= 3) targetBox = Math.max(targetBox, 2);
      
    } else if (fromAlgorithm === 'simple-interval') {
      // Convert simple interval to box
      const interval = card.interval;
      for (let i = this.config.box_intervals.length - 1; i >= 0; i--) {
        if (interval >= this.config.box_intervals[i]) {
          targetBox = i + 1;
          break;
        }
      }
    }
    
    // Ensure box is within valid range
    targetBox = Math.max(1, Math.min(targetBox, this.config.box_count));
    
    migratedCard.interval = this.config.box_intervals[targetBox - 1];
    migratedCard.algorithm_data = {
      ...migratedCard.algorithm_data,
      algorithm_name: this.getAlgorithmName(),
      algorithm_version: this.getVersion(),
      leitner_box: targetBox,
      success_count: 0,
      failure_count: 0,
    };
    
    return migratedCard;
  }

  /**
   * Get recommended study order
   */
  getRecommendedStudyOrder(cards: CardData[]): CardData[] {
    const dueCards = this.getCardsForReview(cards);
    return this.sortCardsByPriority(dueCards);
  }

  /**
   * Calculate mastery level based on box
   */
  getMasteryLevel(card: CardData): 'beginner' | 'intermediate' | 'advanced' | 'mastered' {
    const box = this.getCurrentBox(card);
    const successRate = this.getSuccessRate(card);
    
    if (box === 1 || successRate < 0.3) return 'beginner';
    if (box <= 2 || successRate < 0.6) return 'intermediate';
    if (box <= 3 || successRate < 0.8) return 'advanced';
    return 'mastered';
  }

  /**
   * Calculate success rate for a card
   */
  private getSuccessRate(card: CardData): number {
    const successCount = card.algorithm_data?.success_count || 0;
    const failureCount = card.algorithm_data?.failure_count || 0;
    const total = successCount + failureCount;
    
    return total > 0 ? successCount / total : 0;
  }
}