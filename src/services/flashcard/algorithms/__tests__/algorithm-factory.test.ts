/**
 * Algorithm Factory Tests
 * Tests for the algorithm factory pattern implementation
 */

import { AlgorithmFactory, getAlgorithmFactory, AlgorithmType } from '../algorithm-factory';
import { SpacedRepetitionStrategy } from '../spaced-repetition-strategy';

describe('AlgorithmFactory', () => {
  let factory: AlgorithmFactory;

  beforeEach(() => {
    factory = AlgorithmFactory.getInstance();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const factory1 = AlgorithmFactory.getInstance();
      const factory2 = AlgorithmFactory.getInstance();
      const factory3 = getAlgorithmFactory();
      
      expect(factory1).toBe(factory2);
      expect(factory2).toBe(factory3);
    });
  });

  describe('Algorithm Registration', () => {
    test('should have default algorithms registered', () => {
      const algorithms = factory.getAvailableAlgorithms();
      
      expect(algorithms.length).toBeGreaterThan(0);
      expect(algorithms.some(a => a.type === 'anki-sm2')).toBe(true);
      expect(algorithms.some(a => a.type === 'leitner')).toBe(true);
    });

    test('should provide algorithm information', () => {
      const ankiInfo = factory.getAlgorithmInfo('anki-sm2');
      
      expect(ankiInfo).toBeDefined();
      expect(ankiInfo?.name).toBe('anki-sm2');
      expect(ankiInfo?.displayName).toBe('Anki SM-2');
      expect(ankiInfo?.complexity).toBe('moderate');
      expect(ankiInfo?.features).toContain('Learning phases');
    });

    test('should check algorithm existence', () => {
      expect(factory.hasAlgorithm('anki-sm2')).toBe(true);
      expect(factory.hasAlgorithm('leitner')).toBe(true);
      expect(factory.hasAlgorithm('non-existent' as AlgorithmType)).toBe(false);
    });
  });

  describe('Algorithm Creation', () => {
    test('should create Anki SM-2 algorithm', () => {
      const algorithm = factory.createAlgorithm('anki-sm2');
      
      expect(algorithm).toBeInstanceOf(SpacedRepetitionStrategy);
      expect(algorithm.getAlgorithmName()).toBe('anki-sm2');
      expect(algorithm.getVersion()).toBeDefined();
    });

    test('should create Leitner algorithm', () => {
      const algorithm = factory.createAlgorithm('leitner');
      
      expect(algorithm).toBeInstanceOf(SpacedRepetitionStrategy);
      expect(algorithm.getAlgorithmName()).toBe('leitner');
      expect(algorithm.getVersion()).toBeDefined();
    });

    test('should create algorithm with custom config', () => {
      const customConfig = {
        learning_steps: {
          initial: [5, 15],
          relearning: [15],
          graduating_interval: 2,
          easy_interval: 5,
        },
      };

      const algorithm = factory.createAlgorithm('anki-sm2', customConfig);
      const config = algorithm.getConfig();
      
      expect(config.learning_steps.initial).toEqual([5, 15]);
      expect(config.learning_steps.graduating_interval).toBe(2);
    });

    test('should throw error for unknown algorithm', () => {
      expect(() => {
        factory.createAlgorithm('unknown-algorithm' as AlgorithmType);
      }).toThrow("Algorithm 'unknown-algorithm' is not registered");
    });
  });

  describe('Algorithm Migration', () => {
    test('should create algorithm from persisted data', () => {
      const algorithm = factory.createFromPersistedData('anki-sm2', '2.1.0', {});
      
      expect(algorithm.getAlgorithmName()).toBe('anki-sm2');
    });

    test('should fallback to Anki SM-2 for unknown algorithm', () => {
      const algorithm = factory.createFromPersistedData('unknown-algorithm', '1.0.0', {});
      
      expect(algorithm.getAlgorithmName()).toBe('anki-sm2');
    });

    test('should find algorithm by name', () => {
      const result = factory.getAlgorithmByName('anki-sm2');
      
      expect(result).toBeDefined();
      expect(result?.type).toBe('anki-sm2');
      expect(result?.registry.name).toBe('anki-sm2');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate correct configuration', () => {
      const config = {
        learning_steps: {
          initial: [1, 10],
          relearning: [10],
          graduating_interval: 1,
          easy_interval: 4,
        },
        max_ease_factor: 2.5,
        min_ease_factor: 1.3,
      };

      const result = factory.validateConfig('anki-sm2', config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing configuration keys', () => {
      const incompleteConfig = {
        max_ease_factor: 2.5,
        // Missing required keys
      };

      const result = factory.validateConfig('anki-sm2', incompleteConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should fail validation for unknown algorithm', () => {
      const result = factory.validateConfig('unknown' as AlgorithmType, {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Algorithm 'unknown' is not registered");
    });
  });

  describe('Algorithm Recommendations', () => {
    test('should recommend simple algorithm for beginners', () => {
      const userProfile = {
        experience: 'beginner' as const,
        studyGoals: 'casual' as const,
        preferences: {
          simplicity: 5,
          customization: 1,
        },
      };

      const recommendation = factory.getRecommendedAlgorithm(userProfile);
      
      // Should recommend a simple algorithm
      const algorithmInfo = factory.getAlgorithmInfo(recommendation);
      expect(algorithmInfo?.complexity).toBe('simple');
    });

    test('should recommend advanced algorithm for experts', () => {
      const userProfile = {
        experience: 'advanced' as const,
        studyGoals: 'intensive' as const,
        preferences: {
          simplicity: 1,
          customization: 5,
        },
      };

      const recommendation = factory.getRecommendedAlgorithm(userProfile);
      
      // Should return a valid algorithm type
      expect(factory.hasAlgorithm(recommendation)).toBe(true);
    });
  });

  describe('Algorithm Comparison', () => {
    test('should compare two algorithms', () => {
      const comparison = factory.compareAlgorithms('anki-sm2', 'leitner');
      
      expect(comparison.algorithm1.name).toBe('anki-sm2');
      expect(comparison.algorithm2.name).toBe('leitner');
      expect(comparison.comparison.complexity).toContain('Anki SM-2');
      expect(comparison.comparison.complexity).toContain('Leitner');
      expect(comparison.comparison.features.common).toBeDefined();
      expect(comparison.comparison.features.unique_to_1).toBeDefined();
      expect(comparison.comparison.features.unique_to_2).toBeDefined();
      expect(comparison.comparison.recommendation).toBeDefined();
    });

    test('should throw error when comparing unknown algorithms', () => {
      expect(() => {
        factory.compareAlgorithms('unknown1' as AlgorithmType, 'anki-sm2');
      }).toThrow('One or both algorithms not found');
    });
  });
});