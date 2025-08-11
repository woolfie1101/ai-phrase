/**
 * Learning Session Tests
 * Tests for session management, queue handling, and progress tracking
 */

import { LearningSession, LearningSessionConfig, SessionCard } from '../learning-session';
import { AnkiAlgorithm } from '../anki-algorithm';

describe('LearningSession', () => {
  let session: LearningSession;
  let mockCards: SessionCard[];
  const config: LearningSessionConfig = {
    maxNewCards: 5,
    maxReviewCards: 10,
    learningAheadLimit: 20,
  };

  beforeEach(() => {
    session = new LearningSession('user-id', 'file-id', config);
    
    mockCards = [
      {
        id: 'new-card-1',
        file_id: 'file-id',
        front: 'Front 1',
        back: 'Back 1',
        status: 'new',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date(Date.now() - 60 * 1000).toISOString(), // Due now
        last_review: null,
      },
      {
        id: 'learning-card-1',
        file_id: 'file-id',
        front: 'Front 2',
        back: 'Back 2',
        status: 'learning',
        ease_factor: 2.5,
        interval: 10,
        repetitions: 0,
        due_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Due in 5 minutes
        last_review: null,
      },
      {
        id: 'review-card-1',
        file_id: 'file-id',
        front: 'Front 3',
        back: 'Back 3',
        status: 'review',
        ease_factor: 2.3,
        interval: 7,
        repetitions: 2,
        due_date: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Due 1 hour ago
        last_review: null,
      },
      {
        id: 'suspended-card',
        file_id: 'file-id',
        front: 'Front 4',
        back: 'Back 4',
        status: 'suspended',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date().toISOString(),
        last_review: null,
      }
    ];
  });

  describe('Session Initialization', () => {
    test('should initialize session with correct cards', async () => {
      await session.initializeSession(mockCards);
      
      const stats = session.getStats();
      expect(stats.totalCards).toBe(3); // Excludes suspended card
      
      const progress = session.getProgress();
      expect(progress.total).toBe(3);
      expect(progress.current).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    test('should apply card limits correctly', async () => {
      // Add more cards to test limits
      const manyCards: SessionCard[] = Array.from({ length: 20 }, (_, i) => ({
        id: `card-${i}`,
        file_id: 'file-id',
        front: `Front ${i}`,
        back: `Back ${i}`,
        status: i < 10 ? 'new' : 'review',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date(Date.now() - 60 * 1000).toISOString(),
        last_review: null,
      }));

      await session.initializeSession(manyCards);
      
      const remaining = session.getRemainingCardsByStatus();
      expect(remaining.new).toBeLessThanOrEqual(config.maxNewCards);
      expect(remaining.review).toBeLessThanOrEqual(config.maxReviewCards);
    });

    test('should prioritize cards correctly (new > learning > review)', async () => {
      await session.initializeSession(mockCards);
      
      // First card should be new
      const firstCard = session.getCurrentCard();
      expect(firstCard?.status).toBe('new');
    });
  });

  describe('Session Progress', () => {
    beforeEach(async () => {
      await session.initializeSession(mockCards);
    });

    test('should track session progress correctly', async () => {
      const { nextCard } = await session.processResponse('good', 2000);
      
      const progress = session.getProgress();
      expect(progress.current).toBe(1);
      expect(progress.percentage).toBeCloseTo(33.3, 1);
    });

    test('should update statistics correctly', async () => {
      await session.processResponse('good', 2000);
      await session.processResponse('hard', 1500);
      
      const stats = session.getStats();
      expect(stats.completedCards).toBe(2);
      expect(stats.averageResponseTime).toBe(1750);
      expect(stats.accuracyRate).toBe(50); // 1 correct out of 2
    });

    test('should handle session completion', async () => {
      // Process all cards
      while (!session.isCompleted()) {
        await session.processResponse('good', 1000);
      }
      
      expect(session.isCompleted()).toBe(true);
      expect(session.getCurrentCard()).toBeNull();
    });
  });

  describe('Card Re-queuing', () => {
    beforeEach(async () => {
      await session.initializeSession(mockCards);
    });

    test('should re-queue failed review cards', async () => {
      // Get a review card and fail it
      let currentCard = session.getCurrentCard();
      while (currentCard && currentCard.status !== 'review') {
        await session.processResponse('good', 1000);
        currentCard = session.getCurrentCard();
      }

      if (currentCard) {
        const initialTotal = session.getStats().totalCards;
        await session.processResponse('again', 1000);
        
        // Card should be added back to queue
        const newTotal = session.getStats().totalCards;
        expect(newTotal).toBeGreaterThan(initialTotal);
      }
    });

    test('should handle learning cards that need immediate review', async () => {
      // Mock a learning card that becomes due immediately
      const learningCard = mockCards.find(c => c.status === 'learning');
      if (learningCard) {
        learningCard.due_date = new Date().toISOString(); // Due now
        
        await session.initializeSession(mockCards);
        const { nextCard } = await session.processResponse('again', 1000);
        
        // Should have re-queued the learning card
        expect(session.getStats().totalCards).toBeGreaterThan(3);
      }
    });
  });

  describe('Session Controls', () => {
    beforeEach(async () => {
      await session.initializeSession(mockCards);
    });

    test('should skip cards correctly', () => {
      const initialCard = session.getCurrentCard();
      const nextCard = session.skipCurrentCard();
      
      expect(nextCard?.id).not.toBe(initialCard?.id);
    });

    test('should undo last review', async () => {
      const initialProgress = session.getProgress();
      await session.processResponse('good', 1000);
      
      const afterResponse = session.getProgress();
      expect(afterResponse.current).toBe(initialProgress.current + 1);
      
      const undoSuccess = session.undoLastReview();
      expect(undoSuccess).toBe(true);
      
      const afterUndo = session.getProgress();
      expect(afterUndo.current).toBe(initialProgress.current);
    });

    test('should not undo when no reviews to undo', () => {
      const undoSuccess = session.undoLastReview();
      expect(undoSuccess).toBe(false);
    });
  });

  describe('Session End', () => {
    beforeEach(async () => {
      await session.initializeSession(mockCards);
    });

    test('should generate correct session results', async () => {
      // Complete some cards
      await session.processResponse('good', 2000);
      await session.processResponse('easy', 1500);
      await session.processResponse('again', 1000);
      
      const { stats, studySession } = session.endSession();
      
      expect(stats.completedCards).toBe(3);
      expect(stats.sessionEndTime).toBeDefined();
      expect(stats.studyDuration).toBeGreaterThan(0);
      
      expect(studySession.user_id).toBe('user-id');
      expect(studySession.file_id).toBe('file-id');
      expect(studySession.cards_studied).toBe(3);
      expect(studySession.correct_answers).toBe(2); // good + easy
      expect(studySession.study_duration).toBe(stats.studyDuration);
    });
  });

  describe('Custom Learning Steps', () => {
    test('should work with custom algorithm', async () => {
      const customAlgorithm = new AnkiAlgorithm({
        initial: [5, 15, 30], // Custom learning steps
        relearning: [15],
        graduating_interval: 2,
        easy_interval: 5,
      });

      const customSession = new LearningSession(
        'user-id',
        'file-id',
        config,
        customAlgorithm
      );

      await customSession.initializeSession(mockCards);
      
      // Test that custom steps are applied
      const { updateResult } = await customSession.processResponse('again', 1000);
      expect(updateResult.interval).toBe(5); // Custom first step
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty card set', async () => {
      await session.initializeSession([]);
      
      expect(session.getCurrentCard()).toBeNull();
      expect(session.isCompleted()).toBe(true);
      expect(session.getStats().totalCards).toBe(0);
    });

    test('should handle cards not due yet', async () => {
      const futureCards = mockCards.map(card => ({
        ...card,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
      }));

      await session.initializeSession(futureCards);
      
      // Only learning cards within ahead limit should be included
      const stats = session.getStats();
      expect(stats.totalCards).toBeLessThan(mockCards.length);
    });

    test('should handle session with only suspended cards', async () => {
      const suspendedCards = mockCards.map(card => ({
        ...card,
        status: 'suspended' as const,
      }));

      await session.initializeSession(suspendedCards);
      
      expect(session.getCurrentCard()).toBeNull();
      expect(session.isCompleted()).toBe(true);
    });
  });
});