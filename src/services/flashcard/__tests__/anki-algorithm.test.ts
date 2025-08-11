/**
 * Anki Algorithm Tests
 * Comprehensive tests for SM-2 spaced repetition algorithm
 */

import { AnkiAlgorithm, FlashcardData, UserResponse, CardUpdateResult } from '../anki-algorithm';

describe('AnkiAlgorithm', () => {
  let algorithm: AnkiAlgorithm;
  let mockCard: FlashcardData;

  beforeEach(() => {
    algorithm = new AnkiAlgorithm();
    mockCard = {
      id: 'test-card',
      status: 'new',
      ease_factor: 2.5,
      interval: 1,
      repetitions: 0,
      due_date: new Date().toISOString(),
      last_review: null,
    };
  });

  describe('New Card Handling', () => {
    test('should handle new card "again" response', () => {
      const result = algorithm.calculateNextReview(mockCard, 'again');
      
      expect(result.status).toBe('learning');
      expect(result.interval).toBe(1); // 1 minute
      expect(result.repetitions).toBe(0);
      expect(result.graduated_today).toBe(false);
    });

    test('should handle new card "good" response', () => {
      const result = algorithm.calculateNextReview(mockCard, 'good');
      
      expect(result.status).toBe('learning');
      expect(result.interval).toBe(1); // 1 minute
      expect(result.repetitions).toBe(0);
      expect(result.graduated_today).toBe(false);
    });

    test('should handle new card "easy" response', () => {
      const result = algorithm.calculateNextReview(mockCard, 'easy');
      
      expect(result.status).toBe('review');
      expect(result.interval).toBe(4); // 4 days
      expect(result.repetitions).toBe(1);
      expect(result.ease_factor).toBeCloseTo(2.65);
      expect(result.graduated_today).toBe(true);
    });
  });

  describe('Learning Card Handling', () => {
    beforeEach(() => {
      mockCard.status = 'learning';
      mockCard.interval = 1; // First learning step
    });

    test('should reset to first step on "again"', () => {
      const result = algorithm.calculateNextReview(mockCard, 'again');
      
      expect(result.status).toBe('learning');
      expect(result.interval).toBe(1); // Back to first step
    });

    test('should advance to next learning step on "good"', () => {
      const result = algorithm.calculateNextReview(mockCard, 'good');
      
      expect(result.status).toBe('learning');
      expect(result.interval).toBe(10); // Second step
    });

    test('should graduate to review after final learning step', () => {
      mockCard.interval = 10; // Last learning step
      const result = algorithm.calculateNextReview(mockCard, 'good');
      
      expect(result.status).toBe('review');
      expect(result.interval).toBe(1); // Graduating interval
      expect(result.repetitions).toBe(1);
      expect(result.graduated_today).toBe(true);
    });

    test('should graduate immediately on "easy"', () => {
      const result = algorithm.calculateNextReview(mockCard, 'easy');
      
      expect(result.status).toBe('review');
      expect(result.interval).toBe(4); // Easy interval
      expect(result.repetitions).toBe(1);
      expect(result.graduated_today).toBe(true);
    });
  });

  describe('Review Card Handling', () => {
    beforeEach(() => {
      mockCard.status = 'review';
      mockCard.repetitions = 2;
      mockCard.interval = 6;
    });

    test('should handle review card "again" (lapse)', () => {
      const result = algorithm.calculateNextReview(mockCard, 'again');
      
      expect(result.status).toBe('learning');
      expect(result.interval).toBe(10); // Relearning step
      expect(result.ease_factor).toBeCloseTo(2.3); // Reduced by 0.2
    });

    test('should reduce ease factor on "hard"', () => {
      const result = algorithm.calculateNextReview(mockCard, 'hard');
      
      expect(result.status).toBe('review');
      expect(result.ease_factor).toBeCloseTo(2.35); // Reduced by 0.15
      expect(result.interval).toBeCloseTo(7.2); // interval * 1.2
      expect(result.repetitions).toBe(3);
    });

    test('should apply standard SM-2 on "good"', () => {
      const result = algorithm.calculateNextReview(mockCard, 'good');
      
      expect(result.status).toBe('review');
      expect(result.ease_factor).toBe(2.5); // Unchanged
      expect(result.interval).toBe(15); // 6 * 2.5
      expect(result.repetitions).toBe(3);
    });

    test('should increase ease factor on "easy"', () => {
      const result = algorithm.calculateNextReview(mockCard, 'easy');
      
      expect(result.status).toBe('review');
      expect(result.ease_factor).toBeCloseTo(2.65); // Increased by 0.15
      expect(result.interval).toBeCloseTo(19.5); // 6 * 2.5 * 1.3
      expect(result.repetitions).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle minimum ease factor', () => {
      mockCard.status = 'review';
      mockCard.ease_factor = 1.3;
      
      const result = algorithm.calculateNextReview(mockCard, 'again');
      
      expect(result.ease_factor).toBe(1.3); // Should not go below 1.3
    });

    test('should handle maximum ease factor', () => {
      mockCard.status = 'review';
      mockCard.ease_factor = 2.5;
      
      const result = algorithm.calculateNextReview(mockCard, 'easy');
      
      expect(result.ease_factor).toBe(2.5); // Should not go above 2.5
    });

    test('should handle first review interval', () => {
      mockCard.status = 'review';
      mockCard.repetitions = 0;
      
      const result = algorithm.calculateNextReview(mockCard, 'good');
      
      expect(result.interval).toBe(1); // Special case for first review
    });

    test('should handle second review interval', () => {
      mockCard.status = 'review';
      mockCard.repetitions = 1;
      
      const result = algorithm.calculateNextReview(mockCard, 'good');
      
      expect(result.interval).toBe(6); // Special case for second review
    });
  });

  describe('Card Filtering and Sorting', () => {
    const testCards: FlashcardData[] = [
      {
        id: 'card1',
        status: 'new',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
        last_review: null,
      },
      {
        id: 'card2',
        status: 'learning',
        ease_factor: 2.5,
        interval: 10,
        repetitions: 0,
        due_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
        last_review: null,
      },
      {
        id: 'card3',
        status: 'review',
        ease_factor: 2.3,
        interval: 7,
        repetitions: 2,
        due_date: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        last_review: null,
      },
      {
        id: 'card4',
        status: 'suspended',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date(Date.now() - 60 * 1000).toISOString(),
        last_review: null,
      }
    ];

    test('should filter cards for review correctly', () => {
      const dueCards = AnkiAlgorithm.getCardsForReview(testCards);
      
      expect(dueCards).toHaveLength(2);
      expect(dueCards.map(c => c.id)).toEqual(['card1', 'card3']);
    });

    test('should sort cards by priority correctly', () => {
      const dueCards = AnkiAlgorithm.getCardsForReview(testCards);
      const sortedCards = AnkiAlgorithm.sortCardsByPriority(dueCards);
      
      // Should be: new (card1), then review (card3)
      expect(sortedCards[0].id).toBe('card1');
      expect(sortedCards[0].status).toBe('new');
      expect(sortedCards[1].id).toBe('card3');
      expect(sortedCards[1].status).toBe('review');
    });
  });

  describe('Date Calculations', () => {
    test('should calculate correct due dates for minutes', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z');
      const result = algorithm.calculateNextReview(mockCard, 'again', baseTime);
      
      const expectedDueTime = new Date(baseTime.getTime() + 1 * 60 * 1000);
      expect(new Date(result.due_date)).toEqual(expectedDueTime);
    });

    test('should calculate correct due dates for days', () => {
      mockCard.status = 'learning';
      mockCard.interval = 10; // Last learning step
      
      const baseTime = new Date('2024-01-01T12:00:00Z');
      const result = algorithm.calculateNextReview(mockCard, 'good', baseTime);
      
      const expectedDueDate = new Date(baseTime);
      expectedDueDate.setDate(baseTime.getDate() + 1);
      expect(new Date(result.due_date)).toEqual(expectedDueDate);
    });
  });

  describe('Long-term Algorithm Stability', () => {
    test('should maintain stability over multiple reviews', () => {
      let card = { ...mockCard, status: 'review' as const, repetitions: 1, interval: 1 };
      const responses: UserResponse[] = ['good', 'good', 'good', 'good', 'hard', 'good'];
      
      responses.forEach((response, index) => {
        const result = algorithm.calculateNextReview(card, response);
        
        // Update card for next iteration
        card = {
          ...card,
          status: result.status,
          ease_factor: result.ease_factor,
          interval: result.interval,
          repetitions: result.repetitions,
          due_date: result.due_date.toISOString(),
        };
        
        // Verify constraints
        expect(result.ease_factor).toBeGreaterThanOrEqual(1.3);
        expect(result.ease_factor).toBeLessThanOrEqual(2.5);
        expect(result.interval).toBeGreaterThan(0);
        expect(result.repetitions).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle repeated failures gracefully', () => {
      let card = { ...mockCard, status: 'review' as const, repetitions: 5, interval: 30 };
      
      for (let i = 0; i < 10; i++) {
        const result = algorithm.calculateNextReview(card, 'again');
        
        card = {
          ...card,
          status: result.status,
          ease_factor: result.ease_factor,
          interval: result.interval,
          repetitions: result.repetitions,
        };
        
        // Should not crash and should maintain minimum ease factor
        expect(result.ease_factor).toBeGreaterThanOrEqual(1.3);
        expect(result.status).toBe('learning');
      }
    });
  });
});