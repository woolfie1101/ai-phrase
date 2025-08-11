/**
 * Algorithm Factory
 * Factory pattern for creating and managing spaced repetition algorithms
 */

import { SpacedRepetitionStrategy, AlgorithmConfig } from './spaced-repetition-strategy';

export type AlgorithmType = 'anki-sm2' | 'leitner' | 'simple-interval' | 'fsrs';

export interface AlgorithmRegistry {
  name: string;
  displayName: string;
  description: string;
  version: string;
  factory: (config?: AlgorithmConfig) => SpacedRepetitionStrategy;
  defaultConfig: AlgorithmConfig;
  features: string[];
  complexity: 'simple' | 'moderate' | 'advanced';
}

/**
 * Singleton factory for spaced repetition algorithms
 */
export class AlgorithmFactory {
  private static instance: AlgorithmFactory;
  private algorithms: Map<AlgorithmType, AlgorithmRegistry> = new Map();

  private constructor() {
    // Initialize with default algorithms
    this.registerDefaultAlgorithms();
  }

  static getInstance(): AlgorithmFactory {
    if (!AlgorithmFactory.instance) {
      AlgorithmFactory.instance = new AlgorithmFactory();
    }
    return AlgorithmFactory.instance;
  }

  /**
   * Register an algorithm
   */
  registerAlgorithm(type: AlgorithmType, registry: AlgorithmRegistry): void {
    this.algorithms.set(type, registry);
  }

  /**
   * Create an algorithm instance
   */
  createAlgorithm(type: AlgorithmType, config?: AlgorithmConfig): SpacedRepetitionStrategy {
    const registry = this.algorithms.get(type);
    if (!registry) {
      throw new Error(`Algorithm '${type}' is not registered`);
    }

    const mergedConfig = config ? { ...registry.defaultConfig, ...config } : registry.defaultConfig;
    return registry.factory(mergedConfig);
  }

  /**
   * Get available algorithms
   */
  getAvailableAlgorithms(): Array<{ type: AlgorithmType; registry: AlgorithmRegistry }> {
    return Array.from(this.algorithms.entries()).map(([type, registry]) => ({
      type,
      registry,
    }));
  }

  /**
   * Get algorithm information
   */
  getAlgorithmInfo(type: AlgorithmType): AlgorithmRegistry | undefined {
    return this.algorithms.get(type);
  }

  /**
   * Check if algorithm exists
   */
  hasAlgorithm(type: AlgorithmType): boolean {
    return this.algorithms.has(type);
  }

  /**
   * Get algorithm by name (for migration purposes)
   */
  getAlgorithmByName(name: string): { type: AlgorithmType; registry: AlgorithmRegistry } | undefined {
    for (const [type, registry] of this.algorithms.entries()) {
      if (registry.name === name) {
        return { type, registry };
      }
    }
    return undefined;
  }

  /**
   * Create algorithm from persisted data
   */
  createFromPersistedData(
    algorithmName: string,
    algorithmVersion: string,
    config: AlgorithmConfig
  ): SpacedRepetitionStrategy {
    const found = this.getAlgorithmByName(algorithmName);
    if (!found) {
      // Fallback to Anki SM-2 if algorithm not found
      console.warn(`Algorithm '${algorithmName}' not found, falling back to Anki SM-2`);
      return this.createAlgorithm('anki-sm2', config);
    }

    // Version compatibility check could be added here
    if (found.registry.version !== algorithmVersion) {
      console.warn(`Algorithm version mismatch: expected ${found.registry.version}, got ${algorithmVersion}`);
    }

    return this.createAlgorithm(found.type, config);
  }

  /**
   * Register default algorithms
   */
  private registerDefaultAlgorithms(): void {
    // Register Anki SM-2 Algorithm
    this.registerAlgorithm('anki-sm2', {
      name: 'anki-sm2',
      displayName: 'Anki SM-2',
      description: 'The proven spaced repetition algorithm used by Anki, based on the SM-2 algorithm with learning phases',
      version: '2.1.0',
      factory: (config) => {
        const { AnkiSM2Strategy } = require('./anki-sm2-strategy');
        return new AnkiSM2Strategy(config);
      },
      defaultConfig: {
        learning_steps: {
          initial: [1, 10],
          relearning: [10],
          graduating_interval: 1,
          easy_interval: 4,
        },
        max_ease_factor: 2.5,
        min_ease_factor: 1.3,
        ease_bonus: 0.15,
        hard_multiplier: 1.2,
        new_interval_multiplier: 1.0,
      },
      features: [
        'Learning phases',
        'Dynamic ease factor',
        'Graduated intervals',
        'Failure recovery',
        'Advanced scheduling',
      ],
      complexity: 'moderate',
    });

    // Register Leitner System
    this.registerAlgorithm('leitner', {
      name: 'leitner',
      displayName: 'Leitner System',
      description: 'Simple and effective box-based spaced repetition system, easy to understand and configure',
      version: '1.0.0',
      factory: (config) => {
        const { LeitnerStrategy } = require('./leitner-strategy');
        return new LeitnerStrategy(config);
      },
      defaultConfig: {
        box_count: 5,
        box_intervals: [1, 3, 7, 14, 30],
        promote_on_success: true,
        demote_on_failure: true,
        graduated_box: 4,
      },
      features: [
        'Box-based organization',
        'Simple progression',
        'Visual progress tracking',
        'Failure reset to box 1',
        'Predictable intervals',
      ],
      complexity: 'simple',
    });

    // Register Simple Interval Algorithm (placeholder for future implementation)
    this.registerAlgorithm('simple-interval', {
      name: 'simple-interval',
      displayName: 'Simple Interval',
      description: 'Basic interval doubling algorithm for straightforward spaced repetition',
      version: '1.0.0',
      factory: (config) => {
        // This would be implemented later
        throw new Error('Simple Interval algorithm not yet implemented');
      },
      defaultConfig: {
        initial_interval: 1,
        success_multiplier: 2,
        failure_reset: true,
      },
      features: [
        'Interval doubling',
        'Simple logic',
        'Fast setup',
      ],
      complexity: 'simple',
    });
  }

  /**
   * Validate algorithm configuration
   */
  validateConfig(type: AlgorithmType, config: AlgorithmConfig): { valid: boolean; errors: string[] } {
    const registry = this.algorithms.get(type);
    if (!registry) {
      return { valid: false, errors: [`Algorithm '${type}' is not registered`] };
    }

    // Basic validation - could be extended with schema validation
    const errors: string[] = [];
    
    // Check if all required keys from default config are present
    const defaultConfig = registry.defaultConfig;
    for (const key in defaultConfig) {
      if (defaultConfig[key] !== undefined && config[key] === undefined) {
        errors.push(`Missing required config key: ${key}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get recommended algorithm for user profile
   */
  getRecommendedAlgorithm(userProfile: {
    experience: 'beginner' | 'intermediate' | 'advanced';
    studyGoals: 'casual' | 'intensive' | 'exam-prep';
    preferences: {
      simplicity: number; // 1-5 scale
      customization: number; // 1-5 scale
    };
  }): AlgorithmType {
    const algorithms = this.getAvailableAlgorithms();
    
    // Simple recommendation logic based on user profile
    if (userProfile.experience === 'beginner' || userProfile.preferences.simplicity >= 4) {
      const simple = algorithms.find(a => a.registry.complexity === 'simple');
      return simple?.type || 'anki-sm2';
    }
    
    if (userProfile.preferences.customization >= 4 && userProfile.experience === 'advanced') {
      const advanced = algorithms.find(a => a.registry.complexity === 'advanced');
      return advanced?.type || 'anki-sm2';
    }
    
    // Default to Anki SM-2 for most users
    return 'anki-sm2';
  }

  /**
   * Compare algorithms
   */
  compareAlgorithms(type1: AlgorithmType, type2: AlgorithmType): {
    algorithm1: AlgorithmRegistry;
    algorithm2: AlgorithmRegistry;
    comparison: {
      complexity: string;
      features: {
        unique_to_1: string[];
        unique_to_2: string[];
        common: string[];
      };
      recommendation: string;
    };
  } {
    const alg1 = this.algorithms.get(type1);
    const alg2 = this.algorithms.get(type2);
    
    if (!alg1 || !alg2) {
      throw new Error('One or both algorithms not found');
    }

    const features1 = new Set(alg1.features);
    const features2 = new Set(alg2.features);
    
    const unique_to_1 = alg1.features.filter(f => !features2.has(f));
    const unique_to_2 = alg2.features.filter(f => !features1.has(f));
    const common = alg1.features.filter(f => features2.has(f));

    let recommendation = '';
    if (alg1.complexity === 'simple' && alg2.complexity !== 'simple') {
      recommendation = `${alg1.displayName} is simpler and better for beginners`;
    } else if (alg2.complexity === 'simple' && alg1.complexity !== 'simple') {
      recommendation = `${alg2.displayName} is simpler and better for beginners`;
    } else if (unique_to_1.length > unique_to_2.length) {
      recommendation = `${alg1.displayName} has more features`;
    } else if (unique_to_2.length > unique_to_1.length) {
      recommendation = `${alg2.displayName} has more features`;
    } else {
      recommendation = 'Both algorithms are similarly capable';
    }

    return {
      algorithm1: alg1,
      algorithm2: alg2,
      comparison: {
        complexity: `${alg1.displayName}: ${alg1.complexity}, ${alg2.displayName}: ${alg2.complexity}`,
        features: { unique_to_1, unique_to_2, common },
        recommendation,
      },
    };
  }
}

// Convenience function to get factory instance
export const getAlgorithmFactory = () => AlgorithmFactory.getInstance();