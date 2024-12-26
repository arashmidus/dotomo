import { useState, useCallback } from 'react';
import { LoggingService } from '../services/LoggingService';

export function useErrorHandler(componentName: string) {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback(
    async (error: Error, details?: any) => {
      await LoggingService.error(error, details, componentName);
      setError(error);
    },
    [componentName]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
} 