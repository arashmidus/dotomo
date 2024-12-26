import { ParsedTodo, TokenMatch } from '../types/nlp';

export class NLPService {
  private static datePatterns = [
    {
      pattern: /today/i,
      getValue: () => new Date(),
    },
    {
      pattern: /tomorrow/i,
      getValue: () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        return date;
      },
    },
    {
      pattern: /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      getValue: (match: string) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match.split(' ')[1].toLowerCase());
        const today = new Date();
        const currentDay = today.getDay();
        const daysUntilTarget = (targetDay + 7 - currentDay) % 7;
        const result = new Date();
        result.setDate(today.getDate() + daysUntilTarget);
        return result;
      },
    },
    {
      pattern: /in (\d+) (day|days|week|weeks)/i,
      getValue: (match: string) => {
        const [_, number, unit] = match.toLowerCase().match(/in (\d+) (day|days|week|weeks)/i) || [];
        const date = new Date();
        const value = parseInt(number);
        if (unit.startsWith('week')) {
          date.setDate(date.getDate() + (value * 7));
        } else {
          date.setDate(date.getDate() + value);
        }
        return date;
      },
    },
  ];

  private static priorityPatterns = [
    { pattern: /!high|!h|!1/i, value: 'high' },
    { pattern: /!medium|!m|!2/i, value: 'medium' },
    { pattern: /!low|!l|!3/i, value: 'low' },
  ];

  static parseTodo(input: string): ParsedTodo {
    const matches: TokenMatch[] = [];
    let dueDate: Date | null = null;
    let priority: ParsedTodo['priority'] = null;
    const tags: string[] = [];

    // Find date patterns
    for (const { pattern, getValue } of this.datePatterns) {
      const match = input.match(pattern);
      if (match) {
        dueDate = getValue(match[0]);
        matches.push({
          type: 'date',
          value: match[0],
          index: match.index!,
        });
      }
    }

    // Find priority patterns
    for (const { pattern, value } of this.priorityPatterns) {
      const match = input.match(pattern);
      if (match) {
        priority = value as ParsedTodo['priority'];
        matches.push({
          type: 'priority',
          value: match[0],
          index: match.index!,
        });
      }
    }

    // Find tags (#tag)
    const tagMatches = input.match(/#\w+/g) || [];
    tagMatches.forEach((tag) => {
      tags.push(tag.slice(1));
      matches.push({
        type: 'tag',
        value: tag,
        index: input.indexOf(tag),
      });
    });

    // Clean up the title by removing matched patterns
    let title = input;
    matches
      .sort((a, b) => b.index - a.index)
      .forEach((match) => {
        title = title.slice(0, match.index) + title.slice(match.index + match.value.length);
      });

    title = title.trim();

    return {
      title,
      dueDate,
      priority,
      tags,
    };
  }

  static getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    
    if (!input.match(/today|tomorrow|next|in \d+/i)) {
      suggestions.push('Add "today", "tomorrow", or "in X days" for due date');
    }
    
    if (!input.match(/![hml1-3]/i)) {
      suggestions.push('Add "!h", "!m", or "!l" for priority');
    }
    
    if (!input.match(/#\w+/)) {
      suggestions.push('Add "#tag" to categorize your todo');
    }
    
    return suggestions;
  }
} 