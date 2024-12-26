import { LoggingService } from './LoggingService';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiService {
  static async handleRequest<T>(
    request: Promise<Response>,
    endpoint: string
  ): Promise<T> {
    try {
      const response = await request;
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || 'API request failed',
          response.status,
          data
        );
      }

      await LoggingService.info(`API call successful: ${endpoint}`, {
        status: response.status,
      });

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      await LoggingService.error(
        error instanceof Error ? error : new Error('Unknown error'),
        { endpoint }
      );

      throw new ApiError('Network request failed');
    }
  }
} 