/**
 * Usage Examples for Strategy Pattern Flashcard System
 * Demonstrates how to use the new algorithm system
 */

import { 
  getAlgorithmFactory, 
  CardServiceV2, 
  AlgorithmType,
  AlgorithmSettings,
  CardData,
  UserResponse
} from '../index';

/**
 * Example 1: Basic Algorithm Usage
 */
export async function basicAlgorithmUsage() {
  // Get the factory instance
  const factory = getAlgorithmFactory();
  
  // Create an Anki SM-2 algorithm with default settings
  const ankiAlgorithm = factory.createAlgorithm('anki-sm2');
  
  // Create a mock card
  const card: CardData = {
    id: 'card-1',
    status: 'new',
    ease_factor: 2.5,
    interval: 1,
    repetitions: 0,
    due_date: new Date().toISOString(),
    last_review: null,
    algorithm_data: {},
  };
  
  // Process a user response
  const result = ankiAlgorithm.calculateNextReview(card, 'good');
  
  console.log('Next review result:', {
    status: result.status,
    interval: result.interval,
    due_date: result.due_date,
    graduated: result.graduated_today,
  });
}

/**
 * Example 2: Custom Algorithm Configuration
 */
export async function customConfigurationExample() {
  const factory = getAlgorithmFactory();
  
  // Create Anki algorithm with custom learning steps
  const customAnki = factory.createAlgorithm('anki-sm2', {
    learning_steps: {
      initial: [5, 15, 30], // 5 min, 15 min, 30 min
      relearning: [20], // 20 minutes for relearning
      graduating_interval: 2, // 2 days instead of 1
      easy_interval: 7, // 7 days for easy cards
    },
    max_ease_factor: 3.0, // Higher max ease factor
    ease_bonus: 0.2, // Bigger bonus for easy responses
  });
  
  // Create Leitner system with custom boxes
  const customLeitner = factory.createAlgorithm('leitner', {
    box_count: 7,
    box_intervals: [1, 2, 4, 8, 16, 32, 64], // Powers of 2
    graduated_box: 5, // Consider graduated at box 5
  });
  
  console.log('Custom algorithms created with specific configurations');
}

/**
 * Example 3: Algorithm Comparison and Selection
 */
export async function algorithmComparisonExample() {
  const factory = getAlgorithmFactory();
  
  // Get all available algorithms
  const algorithms = factory.getAvailableAlgorithms();
  console.log('Available algorithms:', algorithms.map(a => ({
    type: a.type,
    name: a.registry.displayName,
    complexity: a.registry.complexity,
    features: a.registry.features,
  })));
  
  // Compare two algorithms
  const comparison = factory.compareAlgorithms('anki-sm2', 'leitner');
  console.log('Algorithm comparison:', {
    complexity: comparison.comparison.complexity,
    uniqueToAnki: comparison.comparison.features.unique_to_1,
    uniqueToLeitner: comparison.comparison.features.unique_to_2,
    recommendation: comparison.comparison.recommendation,
  });
  
  // Get recommendation for a user profile
  const recommendation = factory.getRecommendedAlgorithm({
    experience: 'beginner',
    studyGoals: 'casual',
    preferences: {
      simplicity: 5,
      customization: 2,
    },
  });
  
  console.log('Recommended algorithm for beginner:', recommendation);
}

/**
 * Example 4: Algorithm Migration
 */
export async function algorithmMigrationExample() {
  const factory = getAlgorithmFactory();
  
  // Original card using Anki SM-2
  const ankiCard: CardData = {
    id: 'card-1',
    status: 'review',
    ease_factor: 2.3,
    interval: 15,
    repetitions: 5,
    due_date: new Date().toISOString(),
    last_review: new Date().toISOString(),
    algorithm_data: {
      algorithm_name: 'anki-sm2',
      algorithm_version: '2.1.0',
    },
  };
  
  // Create Leitner algorithm and migrate the card
  const leitnerAlgorithm = factory.createAlgorithm('leitner');
  const migratedCard = leitnerAlgorithm.migrateCard(ankiCard, 'anki-sm2');
  
  console.log('Migrated card:', {
    originalInterval: ankiCard.interval,
    newInterval: migratedCard.interval,
    originalAlgorithm: ankiCard.algorithm_data?.algorithm_name,
    newAlgorithm: migratedCard.algorithm_data?.algorithm_name,
    leitnerBox: migratedCard.algorithm_data?.leitner_box,
  });
}

/**
 * Example 5: Service Integration with Different Algorithms
 */
export async function serviceIntegrationExample() {
  const cardService = new CardServiceV2();
  
  // Get available algorithms through service
  const availableAlgorithms = cardService.getAvailableAlgorithms();
  console.log('Algorithms available through service:', availableAlgorithms.length);
  
  // Example algorithm settings for a file
  const ankiSettings: AlgorithmSettings = {
    type: 'anki-sm2',
    config: {
      learning_steps: {
        initial: [1, 10],
        relearning: [10],
        graduating_interval: 1,
        easy_interval: 4,
      },
    },
    version: '2.1.0',
  };
  
  const leitnerSettings: AlgorithmSettings = {
    type: 'leitner',
    config: {
      box_count: 5,
      box_intervals: [1, 3, 7, 14, 30],
    },
    version: '1.0.0',
  };
  
  // Simulate changing algorithm for a file
  console.log('Algorithm settings configured for different study methods');
}

/**
 * Example 6: Advanced Leitner Features
 */
export async function leitnerAdvancedExample() {
  const factory = getAlgorithmFactory();
  const { LeitnerStrategy } = await import('../algorithms/leitner-strategy');
  
  const leitnerAlgorithm = factory.createAlgorithm('leitner') as InstanceType<typeof LeitnerStrategy>;
  
  // Mock cards in different boxes
  const cards: CardData[] = [
    {
      id: '1', status: 'new', ease_factor: 2.5, interval: 1, repetitions: 0,
      due_date: new Date().toISOString(), last_review: null,
      algorithm_data: { leitner_box: 1, success_count: 0, failure_count: 0 }
    },
    {
      id: '2', status: 'learning', ease_factor: 2.5, interval: 3, repetitions: 1,
      due_date: new Date().toISOString(), last_review: null,
      algorithm_data: { leitner_box: 2, success_count: 1, failure_count: 0 }
    },
    {
      id: '3', status: 'review', ease_factor: 2.5, interval: 14, repetitions: 3,
      due_date: new Date().toISOString(), last_review: null,
      algorithm_data: { leitner_box: 4, success_count: 8, failure_count: 2 }
    },
  ];
  
  // Get box distribution
  const distribution = leitnerAlgorithm.getBoxDistribution(cards);
  console.log('Box distribution:', distribution);
  
  // Get mastery levels
  cards.forEach(card => {
    const mastery = leitnerAlgorithm.getMasteryLevel(card);
    console.log(`Card ${card.id} mastery level: ${mastery}`);
  });
  
  // Get recommended study order
  const studyOrder = leitnerAlgorithm.getRecommendedStudyOrder(cards);
  console.log('Recommended study order:', studyOrder.map((card: CardData) => card.id));
}

/**
 * Example 7: Error Handling and Validation
 */
export async function errorHandlingExample() {
  const factory = getAlgorithmFactory();
  
  try {
    // Try to create non-existent algorithm
    factory.createAlgorithm('non-existent' as AlgorithmType);
  } catch (error) {
    console.log('Expected error for non-existent algorithm:', (error as Error).message);
  }
  
  // Validate configuration
  const invalidConfig = {
    learning_steps: {
      initial: [], // Empty array - invalid
    },
  };
  
  const validation = factory.validateConfig('anki-sm2', invalidConfig);
  if (!validation.valid) {
    console.log('Configuration validation errors:', validation.errors);
  }
  
  // Test card validation
  const algorithm = factory.createAlgorithm('anki-sm2');
  const invalidCard = {
    id: '', // Invalid - empty ID
    status: 'new',
    ease_factor: 2.5,
    interval: 1,
    repetitions: 0,
    due_date: new Date().toISOString(),
    last_review: null,
  };
  
  const isValid = algorithm.validateCard(invalidCard as CardData);
  console.log('Card validation result:', isValid);
}

/**
 * Example 8: Progressive Learning Session
 */
export async function progressiveLearningExample() {
  const factory = getAlgorithmFactory();
  const algorithm = factory.createAlgorithm('anki-sm2');
  
  // Initialize a new card
  let card: CardData = {
    id: 'learning-card',
    status: 'new',
    ease_factor: 2.5,
    interval: 1,
    repetitions: 0,
    due_date: new Date().toISOString(),
    last_review: null,
    algorithm_data: {},
  };
  
  // Simulate a learning session
  const responses: UserResponse[] = ['good', 'good', 'good', 'hard', 'good'];
  
  console.log('Starting progressive learning session:');
  console.log('Initial card:', { status: card.status, interval: card.interval });
  
  responses.forEach((response) => {
    const result = algorithm.calculateNextReview(card, response);
    
    // Update card for next iteration
    card = {
      ...card,
      status: result.status,
      ease_factor: result.ease_factor,
      interval: result.interval,
      repetitions: result.repetitions,
      due_date: result.due_date.toISOString(),
      last_review: new Date().toISOString(),
      algorithm_data: result.algorithm_data,
    };
    
    console.log(`After response "${response}":`, {
      status: card.status,
      interval: card.interval,
      ease_factor: card.ease_factor.toFixed(2),
      graduated: result.graduated_today,
    });
  });
}

// Export all examples for easy testing
export const examples = {
  basicAlgorithmUsage,
  customConfigurationExample,
  algorithmComparisonExample,
  algorithmMigrationExample,
  serviceIntegrationExample,
  leitnerAdvancedExample,
  errorHandlingExample,
  progressiveLearningExample,
};

// Uncomment to run all examples
// (async () => {
//   console.log('=== Strategy Pattern Usage Examples ===\n');
//   
//   for (const [name, example] of Object.entries(examples)) {
//     console.log(`\n--- ${name} ---`);
//     try {
//       await example();
//     } catch (error) {
//       console.error(`Error in ${name}:`, error.message);
//     }
//   }
// })();