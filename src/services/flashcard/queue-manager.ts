/**
 * Queue Manager for Flashcard Learning
 * Handles card queuing, prioritization, and scheduling logic
 */

import { AnkiAlgorithm, FlashcardData } from './anki-algorithm';
import { Database } from '@/types/database';

type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];
type FlashcardFileRow = Database['public']['Tables']['flashcard_files']['Row'];

export interface QueueConfig {
  maxNewCardsPerDay: number;
  maxReviewCardsPerDay: number;
  learningAheadLimit: number; // minutes
  reviewAheadLimit: number; // days
  newCardOrder: 'created' | 'random' | 'due';
  reviewCardOrder: 'due' | 'random' | 'interval';
}

export interface DailyQueue {
  newCards: FlashcardRow[];
  learningCards: FlashcardRow[];
  reviewCards: FlashcardRow[];
  totalCards: number;
  estimatedStudyTime: number; // in minutes
}

export interface CardCounts {
  new: number;
  learning: number;
  review: number;
  suspended: number;
  total: number;
}

export class QueueManager {
  private algorithm: AnkiAlgorithm;

  constructor(algorithm?: AnkiAlgorithm) {
    this.algorithm = algorithm || new AnkiAlgorithm();
  }

  /**
   * Generate daily learning queue for a user
   */
  generateDailyQueue(
    cards: FlashcardRow[],
    config: QueueConfig,
    currentTime: Date = new Date()
  ): DailyQueue {
    // Separate cards by status
    const newCards = cards.filter(card => card.status === 'new');
    const learningCards = cards.filter(card => card.status === 'learning');
    const reviewCards = cards.filter(card => card.status === 'review');
    const suspendedCards = cards.filter(card => card.status === 'suspended');

    // Filter cards due for study
    const dueNewCards = this.filterDueCards(newCards, currentTime, 'new');
    const dueLearningCards = this.filterDueCards(learningCards, currentTime, 'learning', config.learningAheadLimit);
    const dueReviewCards = this.filterDueCards(reviewCards, currentTime, 'review', config.reviewAheadLimit * 24 * 60);

    // Sort cards according to configuration
    const sortedNewCards = this.sortCards(dueNewCards, config.newCardOrder);
    const sortedLearningCards = this.sortCards(dueLearningCards, 'due');
    const sortedReviewCards = this.sortCards(dueReviewCards, config.reviewCardOrder);

    // Apply daily limits
    const queueNewCards = sortedNewCards.slice(0, config.maxNewCardsPerDay);
    const queueReviewCards = sortedReviewCards.slice(0, config.maxReviewCardsPerDay);
    // Learning cards don't have a daily limit (they need to be completed)
    const queueLearningCards = sortedLearningCards;

    const totalCards = queueNewCards.length + queueLearningCards.length + queueReviewCards.length;
    const estimatedStudyTime = this.estimateStudyTime(queueNewCards, queueLearningCards, queueReviewCards);

    return {
      newCards: queueNewCards,
      learningCards: queueLearningCards,
      reviewCards: queueReviewCards,
      totalCards,
      estimatedStudyTime,
    };
  }

  /**
   * Get card counts for a file or user
   */
  getCardCounts(cards: FlashcardRow[], currentTime: Date = new Date()): CardCounts {
    const counts = cards.reduce(
      (acc, card) => {
        acc[card.status as keyof CardCounts]++;
        acc.total++;
        return acc;
      },
      { new: 0, learning: 0, review: 0, suspended: 0, total: 0 }
    );

    return counts;
  }

  /**
   * Get cards due today
   */
  getCardsDueToday(cards: FlashcardRow[], currentTime: Date = new Date()): FlashcardRow[] {
    const today = new Date(currentTime);
    today.setHours(23, 59, 59, 999); // End of today

    return cards.filter(card => {
      if (card.status === 'suspended') return false;
      const dueDate = new Date(card.due_date);
      return dueDate <= today;
    });
  }

  /**
   * Get overdue cards
   */
  getOverdueCards(cards: FlashcardRow[], currentTime: Date = new Date()): FlashcardRow[] {
    const yesterday = new Date(currentTime);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    return cards.filter(card => {
      if (card.status === 'suspended') return false;
      const dueDate = new Date(card.due_date);
      return dueDate <= yesterday;
    });
  }

  /**
   * Filter cards that are due for study
   */
  private filterDueCards(
    cards: FlashcardRow[],
    currentTime: Date,
    status: string,
    aheadLimitMinutes?: number
  ): FlashcardRow[] {
    let cutoffTime = new Date(currentTime);
    
    if (aheadLimitMinutes) {
      cutoffTime = new Date(currentTime.getTime() + aheadLimitMinutes * 60 * 1000);
    } else {
      // Default to end of day
      cutoffTime.setHours(23, 59, 59, 999);
    }

    return cards.filter(card => {
      const dueDate = new Date(card.due_date);
      return dueDate <= cutoffTime;
    });
  }

  /**
   * Sort cards according to specified order
   */
  private sortCards(cards: FlashcardRow[], order: string): FlashcardRow[] {
    const sortedCards = [...cards];

    switch (order) {
      case 'created':
        return sortedCards.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      case 'due':
        return sortedCards.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      
      case 'interval':
        return sortedCards.sort((a, b) => a.interval - b.interval);
      
      case 'random':
        return sortedCards.sort(() => Math.random() - 0.5);
      
      default:
        return sortedCards;
    }
  }

  /**
   * Estimate study time for a queue
   */
  private estimateStudyTime(
    newCards: FlashcardRow[],
    learningCards: FlashcardRow[],
    reviewCards: FlashcardRow[]
  ): number {
    // Average time per card type (in seconds)
    const timePerNewCard = 30; // New cards take longer
    const timePerLearningCard = 20; // Learning cards are quicker
    const timePerReviewCard = 15; // Review cards are quickest

    const totalSeconds = 
      (newCards.length * timePerNewCard) +
      (learningCards.length * timePerLearningCard) +
      (reviewCards.length * timePerReviewCard);

    return Math.ceil(totalSeconds / 60); // Convert to minutes
  }

  /**
   * Get next card from queue (prioritized)
   */
  getNextCard(queue: DailyQueue): FlashcardRow | null {
    // Priority: learning -> new -> review
    if (queue.learningCards.length > 0) {
      return queue.learningCards.shift()!;
    }
    
    if (queue.newCards.length > 0) {
      return queue.newCards.shift()!;
    }
    
    if (queue.reviewCards.length > 0) {
      return queue.reviewCards.shift()!;
    }
    
    return null;
  }

  /**
   * Check if card should be buried (temporarily hidden)
   */
  shouldBuryCard(card: FlashcardRow, siblingCards: FlashcardRow[]): boolean {
    // Bury cards that are siblings of recently studied cards
    // This prevents studying multiple cards from the same note in one session
    
    // For now, we'll implement a simple version
    // In a full implementation, you'd track recently studied cards
    return false;
  }

  /**
   * Get learning steps remaining for a learning card
   */
  getLearningStepsRemaining(card: FlashcardRow): number {
    if (card.status !== 'learning') return 0;
    
    // This would depend on your learning steps configuration
    // For now, return a simple calculation
    const totalSteps = 2; // Assuming 2 learning steps by default
    const currentStep = Math.min(card.repetitions, totalSteps - 1);
    return totalSteps - currentStep - 1;
  }

  /**
   * Calculate workload for a file
   */
  calculateWorkload(
    cards: FlashcardRow[],
    config: QueueConfig,
    days: number = 7
  ): Array<{ date: string; newCards: number; reviewCards: number; totalCards: number }> {
    const workload = [];
    const currentDate = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      
      const queue = this.generateDailyQueue(cards, config, date);
      
      workload.push({
        date: date.toISOString().split('T')[0],
        newCards: queue.newCards.length,
        reviewCards: queue.reviewCards.length,
        totalCards: queue.totalCards,
      });
    }

    return workload;
  }

  /**
   * Optimize queue for better learning distribution
   */
  optimizeQueue(queue: DailyQueue, maxSessionTime: number): DailyQueue {
    const estimatedTime = queue.estimatedStudyTime;
    
    if (estimatedTime <= maxSessionTime) {
      return queue; // No optimization needed
    }

    // Reduce new cards first to fit time constraint
    const timePerNewCard = 0.5; // 30 seconds in minutes
    const timePerReviewCard = 0.25; // 15 seconds in minutes
    
    let currentTime = queue.learningCards.length * 0.33; // Learning cards are fixed
    let newCardsToKeep = queue.newCards.length;
    let reviewCardsToKeep = queue.reviewCards.length;

    // Adjust new cards
    while (currentTime + (newCardsToKeep * timePerNewCard) + (reviewCardsToKeep * timePerReviewCard) > maxSessionTime && newCardsToKeep > 0) {
      newCardsToKeep--;
    }

    // Adjust review cards if still over time
    while (currentTime + (newCardsToKeep * timePerNewCard) + (reviewCardsToKeep * timePerReviewCard) > maxSessionTime && reviewCardsToKeep > 0) {
      reviewCardsToKeep--;
    }

    return {
      ...queue,
      newCards: queue.newCards.slice(0, newCardsToKeep),
      reviewCards: queue.reviewCards.slice(0, reviewCardsToKeep),
      totalCards: queue.learningCards.length + newCardsToKeep + reviewCardsToKeep,
      estimatedStudyTime: Math.ceil(currentTime + (newCardsToKeep * timePerNewCard) + (reviewCardsToKeep * timePerReviewCard)),
    };
  }
}