// Environment configuration with type safety and validation

interface Config {
  supabase: {
    url: string;
    anonKey: string;
  };
  tts: {
    provider: 'google' | 'azure';
    google?: {
      apiKey: string;
      projectId: string;
    };
    azure?: {
      apiKey: string;
      region: string;
    };
  };
  app: {
    url: string;
    env: 'development' | 'production' | 'test';
  };
  features: {
    ttsEnabled: boolean;
    analyticsEnabled: boolean;
    errorTrackingEnabled: boolean;
  };
}

function validateEnvVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Environment variable ${name} is required but not defined`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

function createConfig(): Config {
  // Required environment variables
  const supabaseUrl = validateEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = validateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Optional TTS configuration
  const googleApiKey = getOptionalEnvVar('GOOGLE_CLOUD_API_KEY');
  const googleProjectId = getOptionalEnvVar('GOOGLE_CLOUD_PROJECT_ID');
  const azureApiKey = getOptionalEnvVar('AZURE_SPEECH_API_KEY');
  const azureRegion = getOptionalEnvVar('AZURE_SPEECH_REGION');

  // Determine TTS provider
  let ttsProvider: 'google' | 'azure' = 'google';
  if (azureApiKey && azureRegion) {
    ttsProvider = 'azure';
  } else if (!googleApiKey || !googleProjectId) {
    console.warn('No TTS provider configured. TTS features will be disabled.');
  }

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    tts: {
      provider: ttsProvider,
      google: googleApiKey && googleProjectId ? {
        apiKey: googleApiKey,
        projectId: googleProjectId,
      } : undefined,
      azure: azureApiKey && azureRegion ? {
        apiKey: azureApiKey,
        region: azureRegion,
      } : undefined,
    },
    app: {
      url: getOptionalEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
      env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    },
    features: {
      ttsEnabled: !!(googleApiKey && googleProjectId) || !!(azureApiKey && azureRegion),
      analyticsEnabled: !!getOptionalEnvVar('GOOGLE_ANALYTICS_ID'),
      errorTrackingEnabled: !!getOptionalEnvVar('SENTRY_DSN'),
    },
  };
}

// Create and export the config
export const config = createConfig();

// Helper functions for accessing config values
export const isProduction = config.app.env === 'production';
export const isDevelopment = config.app.env === 'development';
export const isTest = config.app.env === 'test';

// Feature flags
export const features = config.features;

// API endpoints
export const API_BASE_URL = config.app.url;
export const API_ROUTES = {
  TTS: '/api/tts',
  UPLOAD: '/api/upload',
  FLASHCARDS: '/api/flashcards',
  FOLDERS: '/api/folders',
  STUDY: '/api/study',
  STATS: '/api/stats',
} as const;

// Default values
export const DEFAULTS = {
  STUDY_SCHEDULE: {
    enabled: true,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
  },
  USER_SETTINGS: {
    language: 'ko',
    theme: 'system' as const,
    auto_play_audio: false,
    daily_goal: 20,
    notification_enabled: true,
  },
  CARD_SETTINGS: {
    initial_ease_factor: 2.5,
    minimum_ease_factor: 1.3,
    maximum_ease_factor: 4.0,
    initial_interval: 1,
    graduating_interval: 4,
    maximum_interval: 36500, // ~100 years
  },
} as const;

// Validate config on startup
if (typeof window === 'undefined') {
  // Only validate on server side to avoid errors during build
  try {
    createConfig();
    console.log('✅ Configuration validated successfully');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    if (isProduction) {
      throw error; // Fail fast in production
    }
  }
}