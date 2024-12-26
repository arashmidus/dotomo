import Constants from 'expo-constants';

interface LogData {
  [key: string]: any;
}

class LoggingServiceClass {
  private isInitialized = false;
  private readonly environment = Constants.expoConfig?.extra?.environment || 'development';

  initialize() {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    this.info('LoggingService initialized', { environment: this.environment });
  }

  info(message: string, data?: LogData) {
    this.ensureInitialized();
    this.log('INFO', message, data);
  }

  error(message: string, error?: Error | LogData) {
    this.ensureInitialized();
    let errorData: LogData;
    
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error && typeof error === 'object') {
      errorData = error;
    } else {
      errorData = { details: error };
    }
    
    this.log('ERROR', message, errorData);
  }

  warn(message: string, data?: LogData) {
    this.ensureInitialized();
    this.log('WARN', message, data);
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      this.initialize();
    }
  }

  private log(level: 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) {
    try {
      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        level,
        message,
        data: data || {},
        environment: this.environment,
      };

      if (this.environment === 'development') {
        const formattedData = JSON.stringify(logData.data, null, 2);
        switch (level) {
          case 'ERROR':
            console.error(`[${timestamp}] ${message}:`, formattedData);
            break;
          case 'WARN':
            console.warn(`[${timestamp}] ${message}:`, formattedData);
            break;
          default:
            console.log(`[${timestamp}] ${message}:`, formattedData);
        }
      }
    } catch (err) {
      console.error('Logging failed:', err);
    }
  }
}

export const LoggingService = new LoggingServiceClass(); 