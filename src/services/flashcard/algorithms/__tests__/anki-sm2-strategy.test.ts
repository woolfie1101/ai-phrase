/**
 * Anki SM-2 Strategy Tests
 * Tests for the Strategy pattern implementation of Anki algorithm
 */

import { AnkiSM2Strategy } from '../anki-sm2-strategy';
import { CardData, UserResponse } from '../spaced-repetition-strategy';

describe('AnkiSM2Strategy', () => {
  let strategy: AnkiSM2Strategy;
  let mockCard: CardData;

  beforeEach(() => {
    strategy = new AnkiSM2Strategy();
    mockCard = {
      id: 'test-card',
      status: 'new',
      ease_factor: 2.5,
      interval: 1,
      repetitions: 0,
      due_date: new Date().toISOString(),
      last_review: null,
      algorithm_data: {},
    };
  });

  describe('Algorithm Identity', () => {
    test('should have correct algorithm name and version', () => {
      expect(strategy.getAlgorithmName()).toBe('anki-sm2');
      expect(strategy.getVersion()).toBe('2.1.0');
      expect(strategy.getDefaultConfig()).toBeDefined();
    });
  });

  describe('Card Initialization', () => {
    test('should initialize new card with correct defaults', () => {
      const newCard = strategy.initializeNewCard('test-id');
      
      expect(newCard.status).toBe('new');
      expect(newCard.ease_factor).toBe(2.5);
      expect(newCard.interval).toBe(1);
      expect(newCard.repetitions).toBe(0);
      expect(newCard.algorithm_data?.algorithm_name).toBe('anki-sm2');
      expect(newCard.algorithm_data?.algorithm_version).toBe('2.1.0');
    });
  });

  describe('Card Validation', () => {
    test('should validate correct card data', () => {
      expect(strategy.validateCard(mockCard)).toBe(true);
    });

    test('should reject invalid card data', () => {
      const invalidCard = { ...mockCard, id: '' };
      expect(strategy.validateCard(invalidCard)).toBe(false);
    });
  });

  describe('New Card Processing', () => {
    test('should handle new card "again" response', () => {
      const result = strategy.calculateNextReview(mockCard, 'again');
      
      expect(result.status).toBe('learning');
      expect(result.interval).toBe(1); // First learning step
      expect(result.graduated_today).toBe(false);
      expect(result.algorithm_data?.last_response).toBe('again');
    });

    test('should handle new card "easy" response', () => {
      const result = strategy.calculateNextReview(mockCard, 'easy');
      
      expect(result.status).toBe('review');
      expect(result.interval).toBe(4); // Easy interval
      expect(result.graduated_today).toBe(true);
      expect(result.ease_factor).toBeCloseTo(2.65); // Increased by ease_bonus
    });
  });

  describe('Learning Card Processing', () => {
    beforeEach(() => {
      mockCard.status = 'learning';
      mockCard.interval = 1; // First learning step
    });

    test('should advance through learning steps', () => {
      // First step -> Second step
      const result1 = strategy.calculateNextReview(mockCard, 'good');
      expect(result1.status).toBe('learning');
      expect(result1.interval).toBe(10); // Second learning step

      // Second step -> Graduate
      const learningCard = { ...mockCard, interval: 10 };
      const result2 = strategy.calculateNextReview(learningCard, 'good');
      expect(result2.status).toBe('review');
      expect(result2.graduated_today).toBe(true);
    });

    test('should reset to first step on "again"', () => {
      const result = strategy.calculateNextReview(mockCard, 'again');
      
      expect(result.status).toBe('learning');
      expect(result.interval).toBe(1); // Back to first step
    });
  });

  describe('Review Card Processing', () => {
    beforeEach(() => {
      mockCard.status = 'review';
      mockCard.repetitions = 2;
      mockCard.interval = 6;
    });

    test('should handle review card "good" response', () => {
      const result = strategy.calculateNextReview(mockCard, 'good');
      
      expect(result.status).toBe('review');
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(15); // 6 * 2.5
    });

    test('should demote failed review to learning', () => {
      const result = strategy.calculateNextReview(mockCard, 'again');
      
      expect(result.status).toBe('learning');
      expect(result.ease_factor).toBeCloseTo(2.3); // Decreased by 0.2
    });

    test('should respect ease factor bounds', () => {
      // Test minimum bound
      const lowEaseCard = { ...mockCard, ease_factor: 1.3 };
      const result1 = strategy.calculateNextReview(lowEaseCard, 'again');
      expect(result1.ease_factor).toBe(1.3); // Should not go below minimum

      // Test maximum bound
      const highEaseCard = { ...mockCard, ease_factor: 2.5 };
      const result2 = strategy.calculateNextReview(highEaseCard, 'easy');
      expect(result2.ease_factor).toBe(2.5); // Should not go above maximum
    });
  });

  describe('Custom Configuration', () => {
    test('should use custom learning steps', () => {
      const customStrategy = new AnkiSM2Strategy({
        learning_steps: {
          initial: [5, 15, 30],
          relearning: [20],
          graduating_interval: 2,
          easy_interval: 6,
        },
      });

      const result = customStrategy.calculateNextReview(mockCard, 'again');
      expect(result.interval).toBe(5); // Custom first step
    });

    test('should use custom ease factor bounds', () => {
      const customStrategy = new AnkiSM2Strategy({
        max_ease_factor: 3.0,
        min_ease_factor: 1.5,
        ease_bonus: 0.2,
      });

      const config = customStrategy.getConfig();
      expect(config.max_ease_factor).toBe(3.0);
      expect(config.min_ease_factor).toBe(1.5);
      expect(config.ease_bonus).toBe(0.2);
    });
  });

  describe('Card Migration', () => {
    test('should migrate card from Leitner system', () => {
      const leitnerCard = {
        ...mockCard,
        algorithm_data: { leitner_box: 3 },
      };

      const migratedCard = strategy.migrateCard(leitnerCard, 'leitner');
      
      expect(migratedCard.interval).toBe(4); // 2^(3-1) = 4
      expect(migratedCard.ease_factor).toBe(2.5); // Reset to default
      expect(migratedCard.algorithm_data?.algorithm_name).toBe('anki-sm2');
      expect(migratedCard.algorithm_data?.migrated_from).toBe('leitner');
    });

    test('should migrate card from simple interval system', () => {
      const simpleCard = {
        ...mockCard,
        ease_factor: 2.2,
        interval: 8,
      };

      const migratedCard = strategy.migrateCard(simpleCard, 'simple-interval');
      
      expect(migratedCard.ease_factor).toBe(2.2); // Preserved
      expect(migratedCard.algorithm_data?.algorithm_name).toBe('anki-sm2');
    });
  });

  describe('Sorting and Filtering', () => {
    test('should get cards for review', () => {
      const cards: CardData[] = [
        { ...mockCard, id: '1', due_date: new Date(Date.now() - 60000).toISOString() }, // Due
        { ...mockCard, id: '2', due_date: new Date(Date.now() + 60000).toISOString() }, // Future
        { ...mockCard, id: '3', status: 'suspended' }, // Suspended
      ];

      const dueCards = strategy.getCardsForReview(cards);
      
      expect(dueCards).toHaveLength(1);
      expect(dueCards[0].id).toBe('1');
    });

    test('should sort cards by priority', () => {
      const cards: CardData[] = [
        { ...mockCard, id: '1', status: 'review', due_date: '2024-01-01' },
        { ...mockCard, id: '2', status: 'new', due_date: '2024-01-02' },
        { ...mockCard, id: '3', status: 'learning', due_date: '2024-01-01' },
      ];

      const sortedCards = strategy.sortCardsByPriority(cards);
      
      expect(sortedCards[0].status).toBe('new');
      expect(sortedCards[1].status).toBe('learning');
      expect(sortedCards[2].status).toBe('review');
    });
  });

  describe('Algorithm Data Tracking', () => {
    test('should track response history', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const result = strategy.calculateNextReview(mockCard, 'good', currentTime);
      
      expect(result.algorithm_data?.last_response).toBe('good');
      expect(result.algorithm_data?.response_time).toBe(currentTime.toISOString());
      expect(result.algorithm_data?.algorithm_name).toBe('anki-sm2');
      expect(result.algorithm_data?.algorithm_version).toBe('2.1.0');
    });

    test('should preserve existing algorithm data', () => {
      const cardWithData = {
        ...mockCard,
        algorithm_data: {
          custom_field: 'test_value',
          previous_response: 'hard',
        },
      };

      const result = strategy.calculateNextReview(cardWithData, 'good');
      
      expect(result.algorithm_data?.custom_field).toBe('test_value');
      expect(result.algorithm_data?.last_response).toBe('good');
    });
  });
});