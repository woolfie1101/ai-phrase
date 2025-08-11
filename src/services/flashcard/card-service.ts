/**
 * Flashcard Service Integration
 * Integrates Anki algorithm with database operations and provides high-level API
 */

import { createClient } from '@/lib/supabase';
import { AnkiAlgorithm, UserResponse, CardUpdateResult } from './anki-algorithm';
import { LearningSession, LearningSessionConfig, SessionCard } from './learning-session';
import { QueueManager, QueueConfig, DailyQueue, CardCounts } from './queue-manager';
import { Database } from '@/types/database';

type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];
type FlashcardUpdate = Database['public']['Tables']['flashcards']['Update'];
type FlashcardFileUpdate = Database['public']['Tables']['flashcard_files']['Update'];
type StudySessionInsert = Database['public']['Tables']['study_sessions']['Insert'];
type DailyStatsInsert = Database['public']['Tables']['daily_stats']['Insert'];

export interface StudyModeConfig extends QueueConfig, LearningSessionConfig {
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
}

export class CardService {
  private supabase;
  private algorithm: AnkiAlgorithm;
  private queueManager: QueueManager;

  constructor() {
    this.supabase = createClient();
    this.algorithm = new AnkiAlgorithm();
    this.queueManager = new QueueManager(this.algorithm);
  }

  /**
   * Get study statistics for a flashcard file
   */
  async getFileStudyStats(fileId: string, userId: string): Promise<FileStudyStats> {
    // Get all cards for the file
    const { data: cards, error: cardsError } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('file_id', fileId);

    if (cardsError) throw cardsError;

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

    return {
      cardCounts,
      dailyQueue,
      studyStreak: profile?.streak_count || 0,
      averageAccuracy,
      totalStudyTime,
      lastStudyDate: profile?.last_study_date || undefined,
    };
  }

  /**
   * Start a new learning session
   */
  async startLearningSession(
    fileId: string,
    userId: string,
    config?: Partial<StudyModeConfig>
  ): Promise<LearningSession> {
    // Get all cards for the file
    const { data: cards, error } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('file_id', fileId);

    if (error) throw error;

    // Convert to SessionCard format
    const sessionCards: SessionCard[] = (cards || []).map(card => ({
      id: card.id,
      file_id: card.file_id,
      front: card.front,
      back: card.back,
      notes: card.notes || undefined,
      status: card.status as any,
      ease_factor: card.ease_factor,
      interval: card.interval,
      repetitions: card.repetitions,
      due_date: card.due_date,
      last_review: card.last_review,
      language: card.language || undefined,
    }));

    // Default session config
    const sessionConfig: LearningSessionConfig = {
      maxNewCards: config?.maxNewCardsPerDay || 20,
      maxReviewCards: config?.maxReviewCardsPerDay || 100,
      learningAheadLimit: config?.learningAheadLimit || 20,
    };

    // Create and initialize session
    const session = new LearningSession(userId, fileId, sessionConfig);
    await session.initializeSession(sessionCards);

    return session;
  }

  /**
   * Update card after user response
   */
  async updateCardAfterResponse(
    cardId: string,
    response: UserResponse,
    sessionTime: Date = new Date()
  ): Promise<CardUpdateResult> {
    // Get current card data
    const { data: card, error: getError } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (getError) throw getError;

    // Calculate next review
    const updateResult = this.algorithm.calculateNextReview(
      {
        id: card.id,
        status: card.status as any,
        ease_factor: card.ease_factor,
        interval: card.interval,
        repetitions: card.repetitions,
        due_date: card.due_date,
        last_review: card.last_review,
      },
      response,
      sessionTime
    );

    // Update card in database
    const cardUpdate: FlashcardUpdate = {
      status: updateResult.status,
      ease_factor: updateResult.ease_factor,
      interval: updateResult.interval,
      repetitions: updateResult.repetitions,
      due_date: updateResult.due_date.toISOString(),
      last_review: sessionTime.toISOString(),
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
   * Complete learning session and save results
   */
  async completeLearningSession(
    session: LearningSession
  ): Promise<{ sessionId: string; statsUpdated: boolean }> {
    const { stats, studySession } = session.endSession();

    // Save study session
    const { data: sessionData, error: sessionError } = await this.supabase
      .from('study_sessions')
      .insert(studySession)
      .select('id')
      .single();

    if (sessionError) throw sessionError;

    // Update user profile
    const today = new Date().toISOString().split('T')[0];
    const { error: profileError } = await this.supabase
      .from('user_profiles')
      .update({
        last_study_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', studySession.user_id);

    if (profileError) {
      console.warn('Failed to update user profile:', profileError);
    }

    // Update or create daily stats
    const statsUpdated = await this.updateDailyStats(studySession, stats);

    return {
      sessionId: sessionData.id,
      statsUpdated,
    };
  }

  /**
   * Get cards due for study today
   */
  async getCardsDueToday(fileId: string): Promise<FlashcardRow[]> {
    const { data: cards, error } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('file_id', fileId)
      .neq('status', 'suspended');

    if (error) throw error;

    return this.queueManager.getCardsDueToday(cards || []);
  }

  /**
   * Suspend/unsuspend a card
   */
  async toggleCardSuspension(cardId: string, suspend: boolean): Promise<void> {
    const newStatus = suspend ? 'suspended' : 'new';
    
    const { error } = await this.supabase
      .from('flashcards')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId);

    if (error) throw error;

    // Update file card counts
    const { data: card } = await this.supabase
      .from('flashcards')
      .select('file_id')
      .eq('id', cardId)
      .single();

    if (card) {
      await this.updateFileCardCounts(card.file_id);
    }
  }

  /**
   * Reset card progress (back to new)
   */
  async resetCardProgress(cardId: string): Promise<void> {
    const { error } = await this.supabase
      .from('flashcards')
      .update({
        status: 'new',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date().toISOString(),
        last_review: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId);

    if (error) throw error;

    // Update file card counts
    const { data: card } = await this.supabase
      .from('flashcards')
      .select('file_id')
      .eq('id', cardId)
      .single();

    if (card) {
      await this.updateFileCardCounts(card.file_id);
    }
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
   * Update daily statistics
   */
  private async updateDailyStats(
    studySession: StudySessionInsert,
    sessionStats: any
  ): Promise<boolean> {
    const date = new Date(studySession.session_date!).toISOString().split('T')[0];

    // Try to get existing stats
    const { data: existingStats } = await this.supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', studySession.user_id)
      .eq('date', date)
      .single();

    const studyTimeMinutes = Math.floor((studySession.study_duration || 0) / 60);

    if (existingStats) {
      // Update existing stats
      const { error } = await this.supabase
        .from('daily_stats')
        .update({
          cards_studied: existingStats.cards_studied + (studySession.cards_studied || 0),
          new_cards_learned: existingStats.new_cards_learned + sessionStats.newCardsLearned,
          review_cards_completed: existingStats.review_cards_completed + sessionStats.reviewCardsCompleted,
          study_time_minutes: existingStats.study_time_minutes + studyTimeMinutes,
          completion_percentage: Math.min(100, existingStats.completion_percentage + sessionStats.accuracyRate / 4),
        })
        .eq('id', existingStats.id);

      return !error;
    } else {
      // Create new stats
      const newStats: DailyStatsInsert = {
        user_id: studySession.user_id,
        date,
        cards_studied: studySession.cards_studied || 0,
        new_cards_learned: sessionStats.newCardsLearned,
        review_cards_completed: sessionStats.reviewCardsCompleted,
        study_time_minutes: studyTimeMinutes,
        completion_percentage: Math.min(100, sessionStats.accuracyRate),
      };

      const { error } = await this.supabase
        .from('daily_stats')
        .insert(newStats);

      return !error;
    }
  }

  /**
   * Get study statistics for a date range
   */
  async getStudyStats(userId: string, fromDate: string, toDate: string) {
    const { data, error } = await this.supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Calculate study streak
   */
  async calculateStudyStreak(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('daily_stats')
      .select('date, cards_studied')
      .eq('user_id', userId)
      .gt('cards_studied', 0)
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < data.length; i++) {
      const studyDate = new Date(data[i].date);
      studyDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (studyDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}