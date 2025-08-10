// Database utility functions for AI Phrase
// Provides typed interfaces for Supabase operations

import { supabase } from './supabase'
import { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type Card = Tables['flashcards']['Row']
type CardInsert = Tables['flashcards']['Insert']
type CardUpdate = Tables['flashcards']['Update']

// Folder and File types
type Folder = Tables['folders']['Row']
type FolderInsert = Tables['folders']['Insert']
type FolderUpdate = Tables['folders']['Update']

type FlashcardFile = Tables['flashcard_files']['Row']
type FlashcardFileInsert = Tables['flashcard_files']['Insert']
type FlashcardFileUpdate = Tables['flashcard_files']['Update']

// Extended types for hierarchical folder structure
export interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[]
  files?: FlashcardFile[]
}

// Schedule types for weekly patterns
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export interface Schedule {
  days: DayOfWeek[]
}

// Spaced Repetition Algorithm (SM-2) implementation
export interface ReviewResult {
  newEaseFactor: number
  newInterval: number
  newRepetitions: number
  newStatus: 'new' | 'learning' | 'review' | 'suspended'
  nextDueDate: Date
}

// Quality ratings for SM-2 algorithm
export enum ReviewQuality {
  Again = 0,  // Complete blackout, incorrect response
  Hard = 1,   // Correct response recalled with serious difficulty  
  Good = 2,   // Correct response after some hesitation
  Easy = 3    // Perfect response, immediate recall
}

/**
 * Calculate next review parameters using SM-2 algorithm
 */
export function calculateNextReview(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: ReviewQuality
): ReviewResult {
  let newEaseFactor = easeFactor
  let newInterval = interval
  let newRepetitions = repetitions
  let newStatus: ReviewResult['newStatus'] = 'review'

  switch (quality) {
    case ReviewQuality.Again:
      // Reset card to learning phase
      newEaseFactor = Math.max(1.3, easeFactor - 0.2)
      newInterval = 1
      newRepetitions = 0
      newStatus = 'learning'
      break

    case ReviewQuality.Hard:
      // Reduce ease factor and increase interval slightly
      newEaseFactor = Math.max(1.3, easeFactor - 0.15)
      newInterval = Math.max(1, Math.ceil(interval * 1.2))
      newRepetitions = interval === 1 ? 1 : 2
      newStatus = interval === 1 ? 'learning' : 'review'
      break

    case ReviewQuality.Good:
      // Standard progression
      if (interval === 1) {
        newInterval = 6
        newRepetitions = 1
        newStatus = 'learning'
      } else {
        newInterval = Math.ceil(interval * easeFactor)
        newRepetitions = 2
        newStatus = 'review'
      }
      break

    case ReviewQuality.Easy:
      // Increase ease factor and interval significantly
      newEaseFactor = easeFactor + 0.15
      if (interval === 1) {
        newInterval = 4
        newRepetitions = 1
        newStatus = 'learning'
      } else {
        newInterval = Math.ceil(interval * easeFactor * 1.3)
        newRepetitions = 2
        newStatus = 'review'
      }
      break
  }

  const nextDueDate = new Date()
  nextDueDate.setDate(nextDueDate.getDate() + newInterval)

  return {
    newEaseFactor,
    newInterval,
    newRepetitions,
    newStatus,
    nextDueDate
  }
}

/**
 * Get cards due for study today for a user
 */
export async function getDueCards(userId: string) {
  const { data, error } = await supabase
    .rpc('get_due_cards', { p_user_id: userId })

  if (error) throw error
  return data
}

/**
 * Update a flashcard after review
 */
export async function reviewFlashcard(cardId: string, quality: ReviewQuality) {
  const { error } = await supabase
    .rpc('update_flashcard_review', {
      p_card_id: cardId,
      p_quality: quality
    })

  if (error) throw error
}

/**
 * Get today's study schedule for a user
 */
export async function getTodaysSchedule(userId: string) {
  const { data, error } = await supabase
    .rpc('get_todays_schedule', { p_user_id: userId })

  if (error) throw error
  return data
}

/**
 * Create a new flashcard
 */
export async function createFlashcard(cardData: CardInsert) {
  const { data, error } = await supabase
    .from('flashcards')
    .insert(cardData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update flashcard content (not review data)
 */
export async function updateFlashcard(cardId: string, updates: CardUpdate) {
  const { data, error } = await supabase
    .from('flashcards')
    .update(updates)
    .eq('id', cardId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a flashcard
 */
export async function deleteFlashcard(cardId: string) {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', cardId)

  if (error) throw error
}

/**
 * Get flashcards for a specific file
 */
export async function getFlashcards(fileId: string) {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('file_id', fileId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}


/**
 * Get flashcard files in a folder
 */
export async function getFlashcardFiles(folderId: string) {
  const { data, error } = await supabase
    .from('flashcard_files')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get user's daily statistics
 */
export async function getDailyStats(userId: string, date: string) {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return data
}

/**
 * Update or create daily statistics
 */
export async function upsertDailyStats(statsData: Tables['daily_stats']['Insert']) {
  const { data, error } = await supabase
    .from('daily_stats')
    .upsert(statsData, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(profileData: Tables['user_profiles']['Insert']) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profileData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Record a study session
 */
export async function recordStudySession(sessionData: Tables['study_sessions']['Insert']) {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert(sessionData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Bulk create flashcards from CSV/array data
 */
export async function bulkCreateFlashcards(cardsData: CardInsert[]) {
  const { data, error } = await supabase
    .from('flashcards')
    .insert(cardsData)
    .select()

  if (error) throw error
  return data
}

// =================
// FOLDER MANAGEMENT
// =================

/**
 * Get all folders for a user with hierarchical structure
 */
export async function getUserFoldersWithHierarchy(userId: string): Promise<FolderWithChildren[]> {
  const { data: folders, error } = await supabase
    .from('folders')
    .select(`
      *,
      flashcard_files (*)
    `)
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw error

  // Build hierarchical structure
  const folderMap = new Map<string, FolderWithChildren>()
  const rootFolders: FolderWithChildren[] = []

  // First pass: create map of all folders
  folders?.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      files: folder.flashcard_files || []
    })
  })

  // Second pass: build hierarchy
  folders?.forEach(folder => {
    const folderWithChildren = folderMap.get(folder.id)!
    
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(folderWithChildren)
      }
    } else {
      rootFolders.push(folderWithChildren)
    }
  })

  return rootFolders
}

/**
 * Get flat list of folders for a user
 */
export async function getUserFolders(userId: string) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Create a new folder
 */
export async function createFolder(folderData: {
  name: string
  parentId?: string | null
  userId: string
  schedule?: DayOfWeek[]
  color?: string
}) {
  const { data, error } = await supabase
    .from('folders')
    .insert({
      name: folderData.name,
      parent_id: folderData.parentId || null,
      user_id: folderData.userId,
      schedule: folderData.schedule ? JSON.stringify(folderData.schedule) : '[]',
      color: folderData.color || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a folder
 */
export async function updateFolder(
  folderId: string,
  updates: {
    name?: string
    parentId?: string | null
    schedule?: DayOfWeek[]
    color?: string
  }
) {
  const updateData: FolderUpdate = {}
  
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.parentId !== undefined) updateData.parent_id = updates.parentId
  if (updates.schedule !== undefined) updateData.schedule = JSON.stringify(updates.schedule)
  if (updates.color !== undefined) updateData.color = updates.color

  const { data, error } = await supabase
    .from('folders')
    .update(updateData)
    .eq('id', folderId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a folder and all its contents
 */
export async function deleteFolder(folderId: string) {
  // The database will handle cascading deletes due to foreign key constraints
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)

  if (error) throw error
}

/**
 * Move a folder to a new parent
 */
export async function moveFolder(folderId: string, newParentId: string | null) {
  const { data, error } = await supabase
    .from('folders')
    .update({ parent_id: newParentId })
    .eq('id', folderId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================
// FILE MANAGEMENT
// ================

/**
 * Get files in a specific folder
 */
export async function getFilesInFolder(folderId: string) {
  const { data, error } = await supabase
    .from('flashcard_files')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Create a new flashcard file
 */
export async function createFlashcardFile(fileData: {
  name: string
  folderId: string
  userId: string
  studyMode?: 'bidirectional' | 'front-to-back' | 'back-to-front'
  schedule?: DayOfWeek[]
}) {
  const { data, error } = await supabase
    .from('flashcard_files')
    .insert({
      name: fileData.name,
      folder_id: fileData.folderId,
      user_id: fileData.userId,
      study_mode: fileData.studyMode || 'bidirectional',
      schedule: fileData.schedule ? JSON.stringify(fileData.schedule) : '[]',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a flashcard file
 */
export async function updateFlashcardFile(
  fileId: string,
  updates: {
    name?: string
    folderId?: string
    studyMode?: 'bidirectional' | 'front-to-back' | 'back-to-front'
    schedule?: DayOfWeek[]
  }
) {
  const updateData: FlashcardFileUpdate = {}
  
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.folderId !== undefined) updateData.folder_id = updates.folderId
  if (updates.studyMode !== undefined) updateData.study_mode = updates.studyMode
  if (updates.schedule !== undefined) updateData.schedule = JSON.stringify(updates.schedule)

  const { data, error } = await supabase
    .from('flashcard_files')
    .update(updateData)
    .eq('id', fileId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a flashcard file and all its cards
 */
export async function deleteFlashcardFile(fileId: string) {
  // The database will handle cascading deletes due to foreign key constraints
  const { error } = await supabase
    .from('flashcard_files')
    .delete()
    .eq('id', fileId)

  if (error) throw error
}

/**
 * Move a file to a different folder
 */
export async function moveFile(fileId: string, newFolderId: string) {
  const { data, error } = await supabase
    .from('flashcard_files')
    .update({ folder_id: newFolderId })
    .eq('id', fileId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Search folders and files by name
 */
export async function searchFoldersAndFiles(userId: string, searchTerm: string) {
  const [foldersResult, filesResult] = await Promise.all([
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${searchTerm}%`),
    
    supabase
      .from('flashcard_files')
      .select('*, folders!inner(name)')
      .eq('user_id', userId)
      .ilike('name', `%${searchTerm}%`)
  ])

  if (foldersResult.error) throw foldersResult.error
  if (filesResult.error) throw filesResult.error

  return {
    folders: foldersResult.data,
    files: filesResult.data
  }
}