import { useState, useEffect } from 'react';
import Voice from '@react-native-voice/voice';

export const useVoiceRecognition = () => {
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      setResults(e.value ?? []);
    };

    Voice.onSpeechError = (e) => {
      setError(e.error?.message ?? 'Unknown error');
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  return { results, error };
}; 