/**
 * Leitner Strategy Tests
 * Tests for the Leitner System implementation
 */

import { LeitnerStrategy } from '../leitner-strategy';
import { CardData, UserResponse } from '../spaced-repetition-strategy';

describe('LeitnerStrategy', () => {
  let strategy: LeitnerStrategy;
  let mockCard: CardData;

  beforeEach(() => {
    strategy = new LeitnerStrategy();
    mockCard = {
      id: 'test-card',
      status: 'new',
      ease_factor: 2.5,
      interval: 1,
      repetitions: 0,
      due_date: new Date().toISOString(),
      last_review: null,
      algorithm_data: { leitner_box: 1 },
    };
  });

  describe('Algorithm Identity', () => {
    test('should have correct algorithm name and version', () => {
      expect(strategy.getAlgorithmName()).toBe('leitner');
      expect(strategy.getVersion()).toBe('1.0.0');
    });

    test('should have default configuration', () => {
      const config = strategy.getDefaultConfig();
      expect(config.box_count).toBe(5);
      expect(config.box_intervals).toEqual([1, 3, 7, 14, 30]);
      expect(config.graduated_box).toBe(4);
    });
  });

  describe('Card Initialization', () => {
    test('should initialize new card with Leitner defaults', () => {
      const newCard = strategy.initializeNewCard('test-id');
      
      expect(newCard.status).toBe('new');
      expect(newCard.interval).toBe(1); // Box 1 interval
      expect(newCard.algorithm_data?.leitner_box).toBe(1);
      expect(newCard.algorithm_data?.success_count).toBe(0);
      expect(newCard.algorithm_data?.failure_count).toBe(0);
    });
  });

  describe('Box System Logic', () => {
    test('should promote card to next box on success', () => {
      const result = strategy.calculateNextReview(mockCard, 'good');
      
      expect(result.algorithm_data?.leitner_box).toBe(2);
      expect(result.interval).toBe(3); // Box 2 interval
      expect(result.algorithm_data?.success_count).toBe(1);
    });

    test('should demote card to box 1 on failure', () => {
      const box3Card = {
        ...mockCard,
        status: 'learning' as const,
        algorithm_data: { leitner_box: 3, success_count: 2, failure_count: 0 },
      };

      const result = strategy.calculateNextReview(box3Card, 'again');
      
      expect(result.algorithm_data?.leitner_box).toBe(1);
      expect(result.interval).toBe(1); // Box 1 interval
      expect(result.algorithm_data?.failure_count).toBe(1);
    });

    test('should skip box on easy response', () => {
      const result = strategy.calculateNextReview(mockCard, 'easy');
      
      expect(result.algorithm_data?.leitner_box).toBe(3); // Skipped box 2
      expect(result.interval).toBe(7); // Box 3 interval
    });

    test('should stay in same box or go back on hard response', () => {
      const box3Card = {
        ...mockCard,
        algorithm_data: { leitner_box: 3 },
      };

      const result = strategy.calculateNextReview(box3Card, 'hard');
      
      expect(result.algorithm_data?.leitner_box).toBe(2); // Moved back
      expect(result.interval).toBe(3); // Box 2 interval
    });

    test('should not exceed maximum box count', () => {
      const box5Card = {
        ...mockCard,
        status: 'review' as const,
        algorithm_data: { leitner_box: 5 },
      };

      const result = strategy.calculateNextReview(box5Card, 'good');
      
      expect(result.algorithm_data?.leitner_box).toBe(5); // Should stay at max
      expect(result.interval).toBe(30); // Box 5 interval
    });
  });

  describe('Status Calculation', () => {
    test('should set correct status based on box', () => {
      // Box 1 = new
      const result1 = strategy.calculateNextReview(mockCard, 'good');
      expect(result1.status).toBe('learning');

      // Box 2-3 = learning
      const box2Card = { ...mockCard, algorithm_data: { leitner_box: 2 } };
      const result2 = strategy.calculateNextReview(box2Card, 'good');
      expect(result2.status).toBe('learning');

      // Box 4+ = review (graduated)
      const box3Card = { ...mockCard, algorithm_data: { leitner_box: 3 } };
      const result3 = strategy.calculateNextReview(box3Card, 'good');
      expect(result3.status).toBe('review');
      expect(result3.graduated_today).toBe(true);
    });
  });

  describe('Custom Configuration', () => {
    test('should use custom box configuration', () => {
      const customStrategy = new LeitnerStrategy({
        box_count: 3,
        box_intervals: [2, 5, 10],
        graduated_box: 3,
      });

      const result = customStrategy.calculateNextReview(mockCard, 'good');
      
      expect(result.algorithm_data?.leitner_box).toBe(2);
      expect(result.interval).toBe(5); // Custom box 2 interval
    });

    test('should validate configuration consistency', () => {
      expect(() => {
        new LeitnerStrategy({
          box_count: 3,
          box_intervals: [1, 3], // Mismatched length
        });
      }).toThrow('Box intervals length must match box count');
    });
  });

  describe('Box Distribution Analytics', () => {
    test('should calculate box distribution', () => {
      const cards: CardData[] = [
        { ...mockCard, id: '1', algorithm_data: { leitner_box: 1 } },
        { ...mockCard, id: '2', algorithm_data: { leitner_box: 1 } },
        { ...mockCard, id: '3', algorithm_data: { leitner_box: 2 } },
        { ...mockCard, id: '4', algorithm_data: { leitner_box: 3 } },
        { ...mockCard, id: '5', status: 'suspended' }, // Should be excluded
      ];

      const distribution = strategy.getBoxDistribution(cards);
      
      expect(distribution[1]).toBe(2);
      expect(distribution[2]).toBe(1);
      expect(distribution[3]).toBe(1);
      expect(distribution[4]).toBe(0);
      expect(distribution[5]).toBe(0);
    });
  });

  describe('Mastery Level Calculation', () => {
    test('should calculate mastery level based on box and success rate', () => {
      // Beginner: Box 1, low success rate
      const beginnerCard = {
        ...mockCard,
        algorithm_data: { leitner_box: 1, success_count: 1, failure_count: 4 },
      };
      expect(strategy.getMasteryLevel(beginnerCard)).toBe('beginner');

      // Advanced: Box 4, good success rate
      const advancedCard = {
        ...mockCard,
        algorithm_data: { leitner_box: 4, success_count: 8, failure_count: 2 },
      };
      expect(strategy.getMasteryLevel(advancedCard)).toBe('mastered');
    });
  });

  describe('Card Sorting', () => {
    test('should sort cards by box priority', () => {
      const cards: CardData[] = [
        { ...mockCard, id: '1', algorithm_data: { leitner_box: 3 }, due_date: '2024-01-03' },
        { ...mockCard, id: '2', algorithm_data: { leitner_box: 1 }, due_date: '2024-01-02' },
        { ...mockCard, id: '3', algorithm_data: { leitner_box: 2 }, due_date: '2024-01-01' },
      ];

      const sortedCards = strategy.sortCardsByPriority(cards);
      
      // Should be ordered by box (lower boxes first), then by due date
      expect(sortedCards[0].id).toBe('2'); // Box 1
      expect(sortedCards[1].id).toBe('3'); // Box 2
      expect(sortedCards[2].id).toBe('1'); // Box 3
    });

    test('should prioritize same box by due date', () => {
      const cards: CardData[] = [
        { ...mockCard, id: '1', algorithm_data: { leitner_box: 2 }, due_date: '2024-01-03' },
        { ...mockCard, id: '2', algorithm_data: { leitner_box: 2 }, due_date: '2024-01-01' },
      ];

      const sortedCards = strategy.sortCardsByPriority(cards);
      
      expect(sortedCards[0].id).toBe('2'); // Earlier due date
      expect(sortedCards[1].id).toBe('1');
    });
  });

  describe('Card Migration', () => {
    test('should migrate from Anki SM-2 based on repetitions', () => {
      const ankiCard = {
        ...mockCard,
        repetitions: 3,
        interval: 15,
      };

      const migratedCard = strategy.migrateCard(ankiCard, 'anki-sm2');
      
      expect(migratedCard.algorithm_data?.leitner_box).toBeGreaterThan(1);
      expect(migratedCard.algorithm_data?.algorithm_name).toBe('leitner');
    });

    test('should migrate from simple interval based on interval', () => {
      const simpleCard = {
        ...mockCard,
        interval: 14,
      };

      const migratedCard = strategy.migrateCard(simpleCard, 'simple-interval');
      
      expect(migratedCard.algorithm_data?.leitner_box).toBe(4); // 14 days maps to box 4
      expect(migratedCard.interval).toBe(14); // Should match box 4 interval
    });

    test('should ensure migrated box is within valid range', () => {
      const extremeCard = {
        ...mockCard,
        repetitions: 100, // Would normally map to very high box
      };

      const migratedCard = strategy.migrateCard(extremeCard, 'anki-sm2');
      
      expect(migratedCard.algorithm_data?.leitner_box).toBeLessThanOrEqual(5);
      expect(migratedCard.algorithm_data?.leitner_box).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Study Order Recommendations', () => {
    test('should recommend study order prioritizing lower boxes', () => {
      const cards: CardData[] = [
        { ...mockCard, id: '1', algorithm_data: { leitner_box: 3 }, due_date: new Date(Date.now() - 60000).toISOString() },
        { ...mockCard, id: '2', algorithm_data: { leitner_box: 1 }, due_date: new Date(Date.now() - 120000).toISOString() },
        { ...mockCard, id: '3', algorithm_data: { leitner_box: 2 }, due_date: new Date(Date.now() - 30000).toISOString() },
      ];

      const studyOrder = strategy.getRecommendedStudyOrder(cards);
      
      expect(studyOrder[0].id).toBe('2'); // Box 1 first
      expect(studyOrder[1].id).toBe('3'); // Box 2 second
      expect(studyOrder[2].id).toBe('1'); // Box 3 third
    });
  });

  describe('Algorithm Data Tracking', () => {
    test('should track success and failure counts', () => {
      let card = { ...mockCard };

      // Success
      const result1 = strategy.calculateNextReview(card, 'good');
      expect(result1.algorithm_data?.success_count).toBe(1);
      expect(result1.algorithm_data?.failure_count).toBe(0);

      // Failure
      card.algorithm_data = result1.algorithm_data;
      const result2 = strategy.calculateNextReview(card, 'again');
      expect(result2.algorithm_data?.success_count).toBe(1);
      expect(result2.algorithm_data?.failure_count).toBe(1);
    });

    test('should preserve previous box information', () => {
      const box2Card = {
        ...mockCard,
        algorithm_data: { leitner_box: 2 },
      };

      const result = strategy.calculateNextReview(box2Card, 'good');
      
      expect(result.algorithm_data?.previous_box).toBe(2);
      expect(result.algorithm_data?.leitner_box).toBe(3);
    });
  });
});