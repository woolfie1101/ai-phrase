/**
 * Learning Session Management
 * Manages flashcard learning sessions with queue management and progress tracking
 */

import { AnkiAlgorithm, FlashcardData, UserResponse, CardUpdateResult } from './anki-algorithm';
import { AnkiSM2Strategy } from './algorithms/anki-sm2-strategy';
import { SpacedRepetitionStrategy } from './algorithms/spaced-repetition-strategy';
import { Database } from '@/types/database';

type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];
type StudySessionInsert = Database['public']['Tables']['study_sessions']['Insert'];

export interface SessionCard extends FlashcardData {
  front: string;
  back: string;
  notes?: string;
  file_id: string;
  language?: string;
}

export interface LearningSessionConfig {
  maxNewCards: number;
  maxReviewCards: number;
  learningAheadLimit: number; // Minutes ahead to show learning cards
  timezoneOffset?: number; // For handling user timezone
}

export interface SessionStats {
  totalCards: number;
  completedCards: number;
  newCardsLearned: number;
  reviewCardsCompleted: number;
  learningCardsCompleted: number;
  averageResponseTime: number;
  accuracyRate: number;
  sessionStartTime: Date;
  sessionEndTime?: Date;
  studyDuration: number; // in seconds
}

export interface CardReview {
  cardId: string;
  response: UserResponse;
  responseTime: number; // in milliseconds
  timestamp: Date;
}

export class LearningSession {
  private algorithm: SpacedRepetitionStrategy;
  private config: LearningSessionConfig;
  private sessionQueue: SessionCard[] = [];
  private completedCards: CardReview[] = [];
  private stats: SessionStats;
  private currentCardIndex: number = 0;
  private userId: string;
  private fileId: string;

  constructor(
    userId: string,
    fileId: string,
    config: LearningSessionConfig,
    algorithm?: SpacedRepetitionStrategy
  ) {
    this.algorithm = algorithm || new AnkiSM2Strategy();
    this.config = config;
    this.userId = userId;
    this.fileId = fileId;
    this.stats = {
      totalCards: 0,
      completedCards: 0,
      newCardsLearned: 0,
      reviewCardsCompleted: 0,
      learningCardsCompleted: 0,
      averageResponseTime: 0,
      accuracyRate: 0,
      sessionStartTime: new Date(),
      studyDuration: 0,
    };
  }

  /**
   * Initialize learning session with available cards
   */
  async initializeSession(allCards: SessionCard[]): Promise<void> {
    const currentTime = new Date();
    
    // Filter cards due for review
    const dueCards = AnkiAlgorithm.getCardsForReview(allCards, currentTime);
    
    // Separate cards by status
    const newCards = dueCards.filter(card => card.status === 'new');
    const learningCards = dueCards.filter(card => card.status === 'learning');
    const reviewCards = dueCards.filter(card => card.status === 'review');
    
    // Apply limits
    const selectedNewCards = newCards.slice(0, this.config.maxNewCards);
    const selectedReviewCards = reviewCards.slice(0, this.config.maxReviewCards);
    
    // Include learning cards that are due or within ahead limit
    const selectedLearningCards = learningCards.filter(card => {
      const dueTime = new Date(card.due_date);
      const aheadLimit = new Date(currentTime.getTime() + this.config.learningAheadLimit * 60 * 1000);
      return dueTime <= aheadLimit;
    });
    
    // Combine and sort by priority
    const sessionCards = [...selectedNewCards, ...selectedLearningCards, ...selectedReviewCards];
    this.sessionQueue = AnkiAlgorithm.sortCardsByPriority(sessionCards);
    
    this.stats.totalCards = this.sessionQueue.length;
    this.currentCardIndex = 0;
  }

  /**
   * Get current card for review
   */
  getCurrentCard(): SessionCard | null {
    if (this.currentCardIndex >= this.sessionQueue.length) {
      return null; // Session completed
    }
    return this.sessionQueue[this.currentCardIndex];
  }

  /**
   * Process user response and move to next card
   */
  async processResponse(
    response: UserResponse,
    responseTime: number
  ): Promise<{ updateResult: CardUpdateResult; nextCard: SessionCard | null }> {
    const currentCard = this.getCurrentCard();
    if (!currentCard) {
      throw new Error('No card available for response');
    }

    // Calculate next review using Anki algorithm
    const updateResult = this.algorithm.calculateNextReview(currentCard, response);
    
    // Record the review
    const cardReview: CardReview = {
      cardId: currentCard.id,
      response,
      responseTime,
      timestamp: new Date(),
    };
    this.completedCards.push(cardReview);

    // Update statistics
    this.updateSessionStats(currentCard, response, responseTime);
    
    // Handle relearning cards (insert back into queue)
    if (updateResult.status === 'learning' && currentCard.status === 'review') {
      // Card failed review and went back to learning - add back to queue
      const relearningCard: SessionCard = {
        ...currentCard,
        status: updateResult.status,
        ease_factor: updateResult.ease_factor,
        interval: updateResult.interval,
        repetitions: updateResult.repetitions,
        due_date: updateResult.due_date.toISOString(),
      };
      
      // Insert after current position, maintaining priority order
      this.insertCardInQueue(relearningCard);
    }
    
    // Handle learning cards that need multiple reviews in same session
    if (updateResult.status === 'learning' && updateResult.due_date <= new Date()) {
      // Card is still learning and due immediately - add back to queue
      const continueLearningCard: SessionCard = {
        ...currentCard,
        status: updateResult.status,
        ease_factor: updateResult.ease_factor,
        interval: updateResult.interval,
        repetitions: updateResult.repetitions,
        due_date: updateResult.due_date.toISOString(),
      };
      
      this.insertCardInQueue(continueLearningCard);
    }

    // Move to next card
    this.currentCardIndex++;
    const nextCard = this.getCurrentCard();

    return { updateResult, nextCard };
  }

  /**
   * Insert card back into queue maintaining priority order
   */
  private insertCardInQueue(card: SessionCard): void {
    // Find the right position to insert the card
    let insertIndex = this.currentCardIndex + 1;
    
    // For learning cards, try to space them out a bit
    if (card.status === 'learning') {
      const minGap = Math.min(4, Math.floor(this.sessionQueue.length * 0.1));
      insertIndex = Math.min(this.currentCardIndex + 1 + minGap, this.sessionQueue.length);
    }
    
    this.sessionQueue.splice(insertIndex, 0, card);
    this.stats.totalCards++;
  }

  /**
   * Update session statistics
   */
  private updateSessionStats(card: SessionCard, response: UserResponse, responseTime: number): void {
    this.stats.completedCards++;
    
    // Track learning progress by original status
    switch (card.status) {
      case 'new':
        this.stats.newCardsLearned++;
        break;
      case 'learning':
        this.stats.learningCardsCompleted++;
        break;
      case 'review':
        this.stats.reviewCardsCompleted++;
        break;
    }
    
    // Update response time average
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.completedCards - 1) + responseTime;
    this.stats.averageResponseTime = totalResponseTime / this.stats.completedCards;
    
    // Update accuracy rate (considering 'good' and 'easy' as correct)
    const correctResponses = this.completedCards.filter(
      review => review.response === 'good' || review.response === 'easy'
    ).length;
    this.stats.accuracyRate = (correctResponses / this.stats.completedCards) * 100;
    
    // Update study duration
    this.stats.studyDuration = Math.floor((new Date().getTime() - this.stats.sessionStartTime.getTime()) / 1000);
  }

  /**
   * Get session progress
   */
  getProgress(): { current: number; total: number; percentage: number } {
    const current = this.stats.completedCards;
    const total = this.stats.totalCards;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    return { current, total, percentage };
  }

  /**
   * Get session statistics
   */
  getStats(): SessionStats {
    return { ...this.stats };
  }

  /**
   * Check if session is completed
   */
  isCompleted(): boolean {
    return this.currentCardIndex >= this.sessionQueue.length;
  }

  /**
   * End session and get final results
   */
  endSession(): { stats: SessionStats; studySession: StudySessionInsert } {
    this.stats.sessionEndTime = new Date();
    this.stats.studyDuration = Math.floor((this.stats.sessionEndTime.getTime() - this.stats.sessionStartTime.getTime()) / 1000);
    
    const studySession: StudySessionInsert = {
      user_id: this.userId,
      file_id: this.fileId,
      cards_studied: this.stats.completedCards,
      correct_answers: this.completedCards.filter(
        review => review.response === 'good' || review.response === 'easy'
      ).length,
      study_duration: this.stats.studyDuration,
      session_date: this.stats.sessionStartTime.toISOString(),
    };

    return { stats: this.stats, studySession };
  }

  /**
   * Get remaining cards count by status
   */
  getRemainingCardsByStatus(): { new: number; learning: number; review: number } {
    const remainingCards = this.sessionQueue.slice(this.currentCardIndex);
    
    return {
      new: remainingCards.filter(card => card.status === 'new').length,
      learning: remainingCards.filter(card => card.status === 'learning').length,
      review: remainingCards.filter(card => card.status === 'review').length,
    };
  }

  /**
   * Skip current card (suspend it)
   */
  skipCurrentCard(): SessionCard | null {
    const currentCard = this.getCurrentCard();
    if (!currentCard) {
      return null;
    }

    // Move to next card without processing
    this.currentCardIndex++;
    return this.getCurrentCard();
  }

  /**
   * Undo last card review (if possible)
   */
  undoLastReview(): boolean {
    if (this.completedCards.length === 0 || this.currentCardIndex === 0) {
      return false; // Nothing to undo
    }

    // Remove last review from completed cards
    const lastReview = this.completedCards.pop()!;
    
    // Move back to previous card
    this.currentCardIndex--;
    
    // Reverse statistics updates
    this.stats.completedCards--;
    
    // Update other stats accordingly
    const currentCard = this.getCurrentCard();
    if (currentCard) {
      switch (currentCard.status) {
        case 'new':
          this.stats.newCardsLearned = Math.max(0, this.stats.newCardsLearned - 1);
          break;
        case 'learning':
          this.stats.learningCardsCompleted = Math.max(0, this.stats.learningCardsCompleted - 1);
          break;
        case 'review':
          this.stats.reviewCardsCompleted = Math.max(0, this.stats.reviewCardsCompleted - 1);
          break;
      }
    }

    return true;
  }
}