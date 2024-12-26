import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'todo-app',
  slug: 'todo-app',
  extra: {
    openAiKey: process.env.OPENAI_API_KEY,
    environment: process.env.NODE_ENV || 'development',
  },
}); 