/**
 * Queue Manager Tests
 * Tests for card queuing, filtering, and prioritization logic
 */

import { QueueManager, QueueConfig } from '../queue-manager';
import { Database } from '@/types/database';

type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let mockCards: FlashcardRow[];
  let config: QueueConfig;

  beforeEach(() => {
    queueManager = new QueueManager();
    
    config = {
      maxNewCardsPerDay: 5,
      maxReviewCardsPerDay: 10,
      learningAheadLimit: 20, // minutes
      reviewAheadLimit: 1, // days
      newCardOrder: 'created',
      reviewCardOrder: 'due',
    };

    const baseTime = new Date('2024-01-15T12:00:00Z');
    
    mockCards = [
      // New cards
      {
        id: 'new-1',
        file_id: 'file-1',
        front: 'New Card 1',
        back: 'Answer 1',
        notes: null,
        status: 'new',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: baseTime.toISOString(),
        last_review: null,
        language: null,
        created_at: new Date(baseTime.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        updated_at: baseTime.toISOString(),
      },
      {
        id: 'new-2',
        file_id: 'file-1',
        front: 'New Card 2',
        back: 'Answer 2',
        notes: null,
        status: 'new',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: baseTime.toISOString(),
        last_review: null,
        language: null,
        created_at: new Date(baseTime.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updated_at: baseTime.toISOString(),
      },
      // Learning cards
      {
        id: 'learning-1',
        file_id: 'file-1',
        front: 'Learning Card 1',
        back: 'Answer 3',
        notes: null,
        status: 'learning',
        ease_factor: 2.5,
        interval: 10,
        repetitions: 0,
        due_date: new Date(baseTime.getTime() + 10 * 60 * 1000).toISOString(), // 10 minutes ahead
        last_review: null,
        language: null,
        created_at: baseTime.toISOString(),
        updated_at: baseTime.toISOString(),
      },
      {
        id: 'learning-2',
        file_id: 'file-1',
        front: 'Learning Card 2',
        back: 'Answer 4',
        notes: null,
        status: 'learning',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date(baseTime.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes overdue
        last_review: null,
        language: null,
        created_at: baseTime.toISOString(),
        updated_at: baseTime.toISOString(),
      },
      // Review cards
      {
        id: 'review-1',
        file_id: 'file-1',
        front: 'Review Card 1',
        back: 'Answer 5',
        notes: null,
        status: 'review',
        ease_factor: 2.3,
        interval: 7,
        repetitions: 2,
        due_date: new Date(baseTime.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour overdue
        last_review: null,
        language: null,
        created_at: baseTime.toISOString(),
        updated_at: baseTime.toISOString(),
      },
      {
        id: 'review-2',
        file_id: 'file-1',
        front: 'Review Card 2',
        back: 'Answer 6',
        notes: null,
        status: 'review',
        ease_factor: 2.1,
        interval: 15,
        repetitions: 3,
        due_date: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours ahead (within day limit)
        last_review: null,
        language: null,
        created_at: baseTime.toISOString(),
        updated_at: baseTime.toISOString(),
      },
      // Suspended card
      {
        id: 'suspended-1',
        file_id: 'file-1',
        front: 'Suspended Card',
        back: 'Answer 7',
        notes: null,
        status: 'suspended',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: baseTime.toISOString(),
        last_review: null,
        language: null,
        created_at: baseTime.toISOString(),
        updated_at: baseTime.toISOString(),
      },
    ];
  });

  describe('Daily Queue Generation', () => {
    test('should generate correct daily queue', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(mockCards, config, currentTime);
      
      expect(queue.newCards).toHaveLength(2);
      expect(queue.learningCards).toHaveLength(2); // Both learning cards should be included
      expect(queue.reviewCards).toHaveLength(2);
      expect(queue.totalCards).toBe(6);
      expect(queue.estimatedStudyTime).toBeGreaterThan(0);
    });

    test('should apply daily limits correctly', () => {
      const limitedConfig = { ...config, maxNewCardsPerDay: 1, maxReviewCardsPerDay: 1 };
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(mockCards, limitedConfig, currentTime);
      
      expect(queue.newCards.length).toBeLessThanOrEqual(1);
      expect(queue.reviewCards.length).toBeLessThanOrEqual(1);
      // Learning cards should not be limited
      expect(queue.learningCards.length).toBeGreaterThan(0);
    });

    test('should exclude suspended cards', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(mockCards, config, currentTime);
      
      const allQueueCards = [...queue.newCards, ...queue.learningCards, ...queue.reviewCards];
      const suspendedInQueue = allQueueCards.find(card => card.status === 'suspended');
      
      expect(suspendedInQueue).toBeUndefined();
    });

    test('should respect learning ahead limit', () => {
      const shortConfig = { ...config, learningAheadLimit: 5 }; // Only 5 minutes ahead
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(mockCards, shortConfig, currentTime);
      
      // Should only include learning-2 (overdue) but not learning-1 (10 minutes ahead)
      expect(queue.learningCards).toHaveLength(1);
      expect(queue.learningCards[0].id).toBe('learning-2');
    });
  });

  describe('Card Counting', () => {
    test('should count cards by status correctly', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const counts = queueManager.getCardCounts(mockCards, currentTime);
      
      expect(counts.new).toBe(2);
      expect(counts.learning).toBe(2);
      expect(counts.review).toBe(2);
      expect(counts.suspended).toBe(1);
      expect(counts.total).toBe(7);
    });
  });

  describe('Due Card Filtering', () => {
    test('should get cards due today', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const dueCards = queueManager.getCardsDueToday(mockCards, currentTime);
      
      // Should include: new-1, new-2, learning-2 (overdue), review-1 (overdue), review-2 (within day)
      expect(dueCards).toHaveLength(5);
      expect(dueCards.find(c => c.status === 'suspended')).toBeUndefined();
    });

    test('should get overdue cards', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const overdueCards = queueManager.getOverdueCards(mockCards, currentTime);
      
      // Should include: learning-2 and review-1 (both overdue)
      expect(overdueCards.length).toBeGreaterThan(0);
      expect(overdueCards.every(card => new Date(card.due_date) < new Date(currentTime.getTime() - 24 * 60 * 60 * 1000))).toBe(false);
    });
  });

  describe('Card Sorting', () => {
    test('should sort new cards by creation date', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(mockCards, config, currentTime);
      
      // Should be sorted by creation date (oldest first)
      expect(queue.newCards[0].id).toBe('new-1');
      expect(queue.newCards[1].id).toBe('new-2');
    });

    test('should sort review cards by due date', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(mockCards, config, currentTime);
      
      // Should be sorted by due date (earliest first)
      expect(queue.reviewCards[0].id).toBe('review-1'); // More overdue
      expect(queue.reviewCards[1].id).toBe('review-2');
    });

    test('should handle random sorting', () => {
      const randomConfig = { ...config, newCardOrder: 'random' as const };
      const currentTime = new Date('2024-01-15T12:00:00Z');
      
      // Run multiple times to check randomness
      const results = new Set();
      for (let i = 0; i < 10; i++) {
        const queue = queueManager.generateDailyQueue(mockCards, randomConfig, currentTime);
        if (queue.newCards.length > 1) {
          results.add(queue.newCards[0].id);
        }
      }
      
      // Should have some variation (this is probabilistic, might rarely fail)
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('Queue Optimization', () => {
    test('should optimize queue for time constraints', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const originalQueue = queueManager.generateDailyQueue(mockCards, config, currentTime);
      
      const optimizedQueue = queueManager.optimizeQueue(originalQueue, 2); // 2 minutes max
      
      expect(optimizedQueue.estimatedStudyTime).toBeLessThanOrEqual(2);
      expect(optimizedQueue.totalCards).toBeLessThanOrEqual(originalQueue.totalCards);
      // Learning cards should not be reduced
      expect(optimizedQueue.learningCards.length).toBe(originalQueue.learningCards.length);
    });

    test('should not optimize if within time limit', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const originalQueue = queueManager.generateDailyQueue(mockCards, config, currentTime);
      
      const optimizedQueue = queueManager.optimizeQueue(originalQueue, 60); // 60 minutes max
      
      expect(optimizedQueue).toEqual(originalQueue);
    });
  });

  describe('Next Card Selection', () => {
    test('should prioritize learning cards first', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(mockCards, config, currentTime);
      
      const nextCard = queueManager.getNextCard(queue);
      
      expect(nextCard?.status).toBe('learning');
      expect(queue.learningCards).toHaveLength(1); // One removed
    });

    test('should return null when queue is empty', () => {
      const emptyQueue = {
        newCards: [],
        learningCards: [],
        reviewCards: [],
        totalCards: 0,
        estimatedStudyTime: 0,
      };
      
      const nextCard = queueManager.getNextCard(emptyQueue);
      
      expect(nextCard).toBeNull();
    });
  });

  describe('Workload Calculation', () => {
    test('should calculate workload for multiple days', () => {
      const workload = queueManager.calculateWorkload(mockCards, config, 7);
      
      expect(workload).toHaveLength(7);
      expect(workload[0].date).toBe('2024-01-15'); // Assuming current date
      expect(workload.every(day => typeof day.newCards === 'number')).toBe(true);
      expect(workload.every(day => typeof day.reviewCards === 'number')).toBe(true);
      expect(workload.every(day => typeof day.totalCards === 'number')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty card set', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue([], config, currentTime);
      
      expect(queue.totalCards).toBe(0);
      expect(queue.estimatedStudyTime).toBe(0);
      expect(queue.newCards).toHaveLength(0);
      expect(queue.learningCards).toHaveLength(0);
      expect(queue.reviewCards).toHaveLength(0);
    });

    test('should handle all suspended cards', () => {
      const suspendedCards = mockCards.map(card => ({
        ...card,
        status: 'suspended' as const,
      }));
      
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(suspendedCards, config, currentTime);
      
      expect(queue.totalCards).toBe(0);
    });

    test('should handle cards far in the future', () => {
      const futureCards = mockCards.map(card => ({
        ...card,
        due_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ahead
      }));
      
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const queue = queueManager.generateDailyQueue(futureCards, config, currentTime);
      
      expect(queue.totalCards).toBe(0);
    });
  });
});