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
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const logData = {
        timestamp,
        level,
        message,
        data: data || {},
        environment: this.environment,
      };

      const formattedData = JSON.stringify(logData.data, null, 2);
      const separator = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
      
      switch (level) {
        case 'ERROR':
          console.error(`\n${separator}\n❌ [${timestamp}] ERROR: ${message}\n${formattedData}\n${separator}\n`);
          break;
        case 'WARN':
          console.warn(`\n${separator}\n⚠️  [${timestamp}] WARNING: ${message}\n${formattedData}\n${separator}\n`);
          break;
        default:
          console.log(`\n${separator}\n📝 [${timestamp}] INFO: ${message}\n${formattedData}\n${separator}\n`);
      }
    } catch (err) {
      console.error('❌ Logging failed:', err);
    }
  }
}

export const LoggingService = new LoggingServiceClass(); 