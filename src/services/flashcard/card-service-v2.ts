/**
 * Flashcard Service V2 - Strategy Pattern Implementation
 * Enhanced service using Strategy pattern for algorithm flexibility
 */

import { createClient } from '@/lib/supabase';
import { getAlgorithmFactory, AlgorithmType } from './algorithms/algorithm-factory';
import { SpacedRepetitionStrategy, CardData, UserResponse } from './algorithms/spaced-repetition-strategy';
import { QueueManager, QueueConfig, DailyQueue, CardCounts } from './queue-manager';
import { Database } from '@/types/database';

type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];
type FlashcardUpdate = Database['public']['Tables']['flashcards']['Update'];
type FlashcardFileUpdate = Database['public']['Tables']['flashcard_files']['Update'];
type StudySessionInsert = Database['public']['Tables']['study_sessions']['Insert'];
type DailyStatsInsert = Database['public']['Tables']['daily_stats']['Insert'];

export interface AlgorithmSettings {
  type: AlgorithmType;
  config: Record<string, any>;
  version: string;
}

export interface StudyModeConfig extends QueueConfig {
  algorithm: AlgorithmSettings;
  maxNewCards: number;
  maxReviewCards: number;
  learningAheadLimit: number;
  timezone?: string;
  studyTime?: {
    preferredHour: number;
    maxSessionMinutes: number;
  };
}

export interface FileStudyStats {
  cardCounts: CardCounts;
  dailyQueue: DailyQueue;
  studyStreak: number;
  averageAccuracy: number;
  totalStudyTime: number; // minutes
  lastStudyDate?: string;
  algorithmStats?: {
    name: string;
    version: string;
    features: string[];
    customStats?: Record<string, any>;
  };
}

export class CardServiceV2 {
  private supabase;
  private algorithmFactory;
  private queueManager: QueueManager;

  constructor() {
    this.supabase = createClient();
    this.algorithmFactory = getAlgorithmFactory();
    this.queueManager = new QueueManager();
  }

  /**
   * Get study statistics for a flashcard file with algorithm info
   */
  async getFileStudyStats(fileId: string, userId: string): Promise<FileStudyStats> {
    // Get all cards for the file
    const { data: cards, error: cardsError } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('file_id', fileId);

    if (cardsError) throw cardsError;

    // Get file settings to determine algorithm
    const { data: fileData } = await this.supabase
      .from('flashcard_files')
      .select('*')
      .eq('id', fileId)
      .single();

    // Determine algorithm settings (default to Anki if not specified)
    const algorithmSettings: AlgorithmSettings = fileData?.algorithm_settings || {
      type: 'anki-sm2',
      config: {},
      version: '2.1.0',
    };

    const algorithm = this.algorithmFactory.createAlgorithm(algorithmSettings.type, algorithmSettings.config);
    const algorithmInfo = this.algorithmFactory.getAlgorithmInfo(algorithmSettings.type);

    // Convert database cards to CardData format
    const cardData = this.convertToCardData(cards || []);

    // Get card counts
    const cardCounts = this.queueManager.getCardCounts(cards || []);

    // Generate daily queue
    const defaultConfig: QueueConfig = {
      maxNewCardsPerDay: 20,
      maxReviewCardsPerDay: 100,
      learningAheadLimit: 20,
      reviewAheadLimit: 1,
      newCardOrder: 'created',
      reviewCardOrder: 'due',
    };
    const dailyQueue = this.queueManager.generateDailyQueue(cards || [], defaultConfig);

    // Get user profile for streak
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('streak_count, last_study_date')
      .eq('user_id', userId)
      .single();

    // Get recent study sessions for accuracy
    const { data: recentSessions } = await this.supabase
      .from('study_sessions')
      .select('cards_studied, correct_answers, study_duration')
      .eq('user_id', userId)
      .eq('file_id', fileId)
      .order('session_date', { ascending: false })
      .limit(10);

    let averageAccuracy = 0;
    let totalStudyTime = 0;

    if (recentSessions && recentSessions.length > 0) {
      const totalCards = recentSessions.reduce((sum, session) => sum + session.cards_studied, 0);
      const totalCorrect = recentSessions.reduce((sum, session) => sum + session.correct_answers, 0);
      averageAccuracy = totalCards > 0 ? (totalCorrect / totalCards) * 100 : 0;
      totalStudyTime = recentSessions.reduce((sum, session) => sum + Math.floor(session.study_duration / 60), 0);
    }

    // Algorithm-specific stats
    let customStats: Record<string, any> = {};
    if (algorithmSettings.type === 'leitner') {
      const { LeitnerStrategy } = await import('./algorithms/leitner-strategy');
      if (algorithm instanceof LeitnerStrategy) {
        customStats.boxDistribution = algorithm.getBoxDistribution(cardData);
      }
    }

    return {
      cardCounts,
      dailyQueue,
      studyStreak: profile?.streak_count || 0,
      averageAccuracy,
      totalStudyTime,
      lastStudyDate: profile?.last_study_date || undefined,
      algorithmStats: {
        name: algorithmInfo?.displayName || 'Unknown',
        version: algorithmSettings.version,
        features: algorithmInfo?.features || [],
        customStats,
      },
    };
  }

  /**
   * Update card after user response using configured algorithm
   */
  async updateCardAfterResponse(
    cardId: string,
    response: UserResponse,
    algorithmSettings: AlgorithmSettings,
    sessionTime: Date = new Date()
  ): Promise<any> {
    // Get current card data
    const { data: card, error: getError } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (getError) throw getError;

    // Create algorithm instance
    const algorithm = this.algorithmFactory.createAlgorithm(algorithmSettings.type, algorithmSettings.config);

    // Convert to CardData format
    const cardData: CardData = {
      id: card.id,
      status: card.status as any,
      ease_factor: card.ease_factor,
      interval: card.interval,
      repetitions: card.repetitions,
      due_date: card.due_date,
      last_review: card.last_review,
      algorithm_data: typeof card.algorithm_data === 'object' ? card.algorithm_data : {},
    };

    // Calculate next review using configured algorithm
    const updateResult = algorithm.calculateNextReview(cardData, response, sessionTime);

    // Update card in database
    const cardUpdate: FlashcardUpdate = {
      status: updateResult.status,
      ease_factor: updateResult.ease_factor,
      interval: updateResult.interval,
      repetitions: updateResult.repetitions,
      due_date: updateResult.due_date.toISOString(),
      last_review: sessionTime.toISOString(),
      algorithm_data: updateResult.algorithm_data,
      updated_at: sessionTime.toISOString(),
    };

    const { error: updateError } = await this.supabase
      .from('flashcards')
      .update(cardUpdate)
      .eq('id', cardId);

    if (updateError) throw updateError;

    // Update file card counts
    await this.updateFileCardCounts(card.file_id);

    return updateResult;
  }

  /**
   * Change algorithm for a file (with migration)
   */
  async changeAlgorithm(
    fileId: string,
    newAlgorithmSettings: AlgorithmSettings,
    userId: string
  ): Promise<{ migratedCards: number; errors: string[] }> {
    // Get all cards for the file
    const { data: cards, error: cardsError } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('file_id', fileId);

    if (cardsError) throw cardsError;

    // Get current algorithm settings
    const { data: fileData } = await this.supabase
      .from('flashcard_files')
      .select('algorithm_settings')
      .eq('id', fileId)
      .single();

    const oldAlgorithmSettings: AlgorithmSettings = fileData?.algorithm_settings || {
      type: 'anki-sm2',
      config: {},
      version: '2.1.0',
    };

    // Create new algorithm instance
    const newAlgorithm = this.algorithmFactory.createAlgorithm(
      newAlgorithmSettings.type,
      newAlgorithmSettings.config
    );

    const errors: string[] = [];
    let migratedCards = 0;

    // Migrate each card
    for (const card of cards || []) {
      try {
        const cardData: CardData = {
          id: card.id,
          status: card.status as any,
          ease_factor: card.ease_factor,
          interval: card.interval,
          repetitions: card.repetitions,
          due_date: card.due_date,
          last_review: card.last_review,
          algorithm_data: typeof card.algorithm_data === 'object' ? card.algorithm_data : {},
        };

        // Migrate card to new algorithm
        const migratedCard = newAlgorithm.migrateCard(cardData, oldAlgorithmSettings.type);

        // Update card in database
        const cardUpdate: FlashcardUpdate = {
          status: migratedCard.status,
          ease_factor: migratedCard.ease_factor,
          interval: migratedCard.interval,
          repetitions: migratedCard.repetitions,
          due_date: migratedCard.due_date,
          algorithm_data: migratedCard.algorithm_data,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await this.supabase
          .from('flashcards')
          .update(cardUpdate)
          .eq('id', card.id);

        if (updateError) {
          errors.push(`Failed to migrate card ${card.id}: ${updateError.message}`);
        } else {
          migratedCards++;
        }
      } catch (error) {
        errors.push(`Failed to migrate card ${card.id}: ${error}`);
      }
    }

    // Update file algorithm settings
    const { error: fileUpdateError } = await this.supabase
      .from('flashcard_files')
      .update({
        algorithm_settings: newAlgorithmSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (fileUpdateError) {
      errors.push(`Failed to update file algorithm settings: ${fileUpdateError.message}`);
    }

    // Update file card counts
    await this.updateFileCardCounts(fileId);

    return { migratedCards, errors };
  }

  /**
   * Get available algorithms
   */
  getAvailableAlgorithms() {
    return this.algorithmFactory.getAvailableAlgorithms();
  }

  /**
   * Get algorithm recommendation for user
   */
  getAlgorithmRecommendation(userProfile: {
    experience: 'beginner' | 'intermediate' | 'advanced';
    studyGoals: 'casual' | 'intensive' | 'exam-prep';
    preferences: {
      simplicity: number;
      customization: number;
    };
  }) {
    return this.algorithmFactory.getRecommendedAlgorithm(userProfile);
  }

  /**
   * Compare algorithms
   */
  compareAlgorithms(type1: AlgorithmType, type2: AlgorithmType) {
    return this.algorithmFactory.compareAlgorithms(type1, type2);
  }

  /**
   * Initialize new card with algorithm-specific defaults
   */
  async initializeNewCard(
    cardId: string,
    algorithmSettings: AlgorithmSettings
  ): Promise<Partial<CardData>> {
    const algorithm = this.algorithmFactory.createAlgorithm(algorithmSettings.type, algorithmSettings.config);
    return algorithm.initializeNewCard(cardId);
  }

  /**
   * Convert database cards to CardData format
   */
  private convertToCardData(cards: FlashcardRow[]): CardData[] {
    return cards.map(card => ({
      id: card.id,
      status: card.status as any,
      ease_factor: card.ease_factor,
      interval: card.interval,
      repetitions: card.repetitions,
      due_date: card.due_date,
      last_review: card.last_review,
      algorithm_data: typeof card.algorithm_data === 'object' ? card.algorithm_data : {},
    }));
  }

  /**
   * Update file card counts
   */
  private async updateFileCardCounts(fileId: string): Promise<void> {
    const { data: cards, error } = await this.supabase
      .from('flashcards')
      .select('status')
      .eq('file_id', fileId);

    if (error) throw error;

    const counts = this.queueManager.getCardCounts(cards as any || []);

    const fileUpdate: FlashcardFileUpdate = {
      total_cards: counts.total,
      new_cards: counts.new,
      learning_cards: counts.learning,
      review_cards: counts.review,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await this.supabase
      .from('flashcard_files')
      .update(fileUpdate)
      .eq('id', fileId);

    if (updateError) {
      console.warn('Failed to update file card counts:', updateError);
    }
  }

  /**
   * Legacy method compatibility - delegates to appropriate algorithm
   */
  async updateCardAfterResponseLegacy(
    cardId: string,
    response: UserResponse,
    sessionTime: Date = new Date()
  ): Promise<any> {
    // Get card's file to determine algorithm
    const { data: card } = await this.supabase
      .from('flashcards')
      .select('file_id')
      .eq('id', cardId)
      .single();

    if (!card) throw new Error('Card not found');

    const { data: fileData } = await this.supabase
      .from('flashcard_files')
      .select('algorithm_settings')
      .eq('id', card.file_id)
      .single();

    const algorithmSettings: AlgorithmSettings = fileData?.algorithm_settings || {
      type: 'anki-sm2',
      config: {},
      version: '2.1.0',
    };

    return this.updateCardAfterResponse(cardId, response, algorithmSettings, sessionTime);
  }
}