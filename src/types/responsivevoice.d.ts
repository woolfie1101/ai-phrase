declare global {
  interface Window {
    responsiveVoice?: {
      speak: (text: string, voice: string, options?: {
        rate?: number;
        pitch?: number;
        volume?: number;
        onstart?: () => void;
        onend?: () => void;
        onerror?: () => void;
      }) => void;
      cancel: () => void;
      voiceSupport: () => boolean;
      getVoices: () => any[];
      isPlaying: () => boolean;
    };
  }
}

export {};