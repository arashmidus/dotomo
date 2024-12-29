import { Todo } from '../contexts/TodoContext';
import { LoggingService } from './LoggingService';
import { format } from 'date-fns';
import Constants from 'expo-constants';
import { AppSettings } from '../contexts/SettingsContext';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function createPrompt(todo: Todo): string {
  return `Create a brief, engaging notification for this task:
Title: ${todo.title}
Description: ${todo.description || 'N/A'}
Due Date: ${format(todo.dueDate, 'PPP')}
Tags: ${todo.tags.join(', ') || 'none'}

Make it motivational and concise (under 70 characters). Focus on urgency and importance.`;
}

interface TimingRecommendation {
  recommendedTime: string; // HH:mm format
  reasoning: string;
  confidence: number; // 0-1
}

function createTimingPrompt(todo: Todo, settings?: AppSettings): string {
  if (!settings) {
    console.log('⚠️ No settings provided, using context defaults');
    return ''; // Or handle this case differently
  }

  const formatTimeValue = (time: string) => {
    if (!time) return 'Not set';
    return time.includes(':') ? time : `${time}:00`;
  };

  console.log('================ 📅 USER SCHEDULE ================');
  console.log(`🌅 Wake Up:     ${formatTimeValue(settings.wakeUpTime)}`);
  console.log(`🌙 Bed Time:    ${formatTimeValue(settings.bedTime)}`);
  console.log(`💼 Work Start:  ${formatTimeValue(settings.workStartTime)}`);
  console.log(`🏡 Work End:    ${formatTimeValue(settings.workEndTime)}`);
  console.log('===============================================');

  return `Analyze this task and recommend the optimal notification time for tomorrow:
Title: ${todo.title}
Description: ${todo.description || 'N/A'}
Due Date: ${format(todo.dueDate, 'PPP')}
Tags: ${todo.tags.join(', ') || 'none'}

User Schedule:
- Wake up time: ${formatTimeValue(settings.wakeUpTime)}
- Bed time: ${formatTimeValue(settings.bedTime)}
- Work hours: ${formatTimeValue(settings.workStartTime)} to ${formatTimeValue(settings.workEndTime)}

Consider:
1. Task urgency and importance
2. User's specified working hours
3. Task complexity and preparation needs
4. Human productivity patterns

Respond in JSON format:
{
  "recommendedTime": "HH:mm",
  "reasoning": "brief explanation",
  "confidence": 0.0-1.0
}`;
}

export async function generateReminder(todo: Todo): Promise<string> {
  const apiKey = Constants.expoConfig?.extra?.openAiKey;
  
  if (!apiKey) {
    LoggingService.error('OpenAI API key not found');
    throw new Error('OpenAI API key is required. Please add it to your .env file');
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an AI designed to remind users of their tasks in a style that\'s sharp, direct, and infused with humor and a lot of insult, reminiscent of a motivational coach who uses tough love.',
            },
            {
              role: 'user',
              content: createPrompt(todo),
            },
          ],
          max_tokens: 60,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      LoggingService.error('LLM API error', { error, attempt, todoId: todo.id });
      
      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw new Error('Failed to generate reminder after max retries');
}

export async function generateTaskBreakdown(todo: Partial<Todo>): Promise<string[]> {
  const apiKey = Constants.expoConfig?.extra?.openAiKey;
  
  if (!apiKey) {
    LoggingService.error('OpenAI API key not found');
    throw new Error('OpenAI API key is required');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a task breakdown assistant. Break down tasks into clear, specific, actionable steps.',
          },
          {
            role: 'user',
            content: `Break down this todo task into exactly 3 specific, actionable steps:
Task: ${todo.title}
${todo.description ? `Description: ${todo.description}` : ''}
Priority: ${todo.priority || 'medium'}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      LoggingService.error('API error response:', errorData);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      LoggingService.error('Invalid API response format:', data);
      throw new Error('Invalid API response format');
    }

    const content = data.choices[0].message.content.trim();
    const tasks = content.split('\n')
      .map(task => task.trim())
      .filter(task => task.length > 0)
      .map(task => task.replace(/^[-*•\d.]\s*/, '')); // Remove list markers

    if (tasks.length === 0) {
      LoggingService.error('No tasks generated from content:', content);
      throw new Error('No tasks generated from API response');
    }

    return tasks;
  } catch (error) {
    LoggingService.error('Failed to generate task breakdown:', { error, todoId: todo.id });
    // Return a default task list instead of empty array
    return [
      `Start working on ${todo.title}`,
      'Review progress',
      'Complete and verify'
    ];
  }
}

export async function generateTimingRecommendation(todo: Todo, settings?: AppSettings): Promise<TimingRecommendation> {
  if (!settings) {
    console.warn('No settings provided to generateTimingRecommendation');
    // Use the default settings from SettingsContext
    settings = DEFAULT_SETTINGS;
  }

  console.log('\n🔍 LLM Service - Generating Timing Recommendation');
  console.log('📥 User Schedule Settings:', settings || 'Using default schedule');
  
  const apiKey = Constants.expoConfig?.extra?.openAiKey;
  
  if (!apiKey) {
    console.log('❌ No API key found!');
    LoggingService.error('OpenAI API key not found');
    throw new Error('OpenAI API key is required');
  }

  try {
    console.log('🤖 Sending request to OpenAI...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that analyzes tasks and recommends optimal notification timing. Always respond in valid JSON format.',
          },
          {
            role: 'user',
            content: createTimingPrompt(todo, settings),
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.log('❌ API Response Error:', response.status);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 Raw API Response:', data);

    const recommendation = JSON.parse(data.choices[0].message.content);
    console.log('✅ Parsed Recommendation:', recommendation);
    
    return {
      recommendedTime: recommendation.recommendedTime,
      reasoning: recommendation.reasoning,
      confidence: recommendation.confidence,
    };
  } catch (error) {
    console.log('❌ Error in generateTimingRecommendation:', error);
    LoggingService.error('Failed to generate timing recommendation:', { error, todoId: todo.id });
    // Default to 9 AM if there's an error
    return {
      recommendedTime: "09:00",
      reasoning: "Default morning reminder due to API error",
      confidence: 0.5
    };
  }
} 