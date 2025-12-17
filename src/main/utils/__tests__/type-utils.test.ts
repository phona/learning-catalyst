import { describe, it, expect } from 'vitest';

describe('Type Utils - Interface Tests', () => {
  describe('Type Guards', () => {
    it('should check for valid agent types', () => {
      const validAgentTypes = ['learning', 'tutoring', 'assessment', 'practice'];

      const isAgentType = (
        type: any,
      ): type is 'learning' | 'tutoring' | 'assessment' | 'practice' => {
        return validAgentTypes.includes(type);
      };

      expect(isAgentType('learning')).toBe(true);
      expect(isAgentType('tutoring')).toBe(true);
      expect(isAgentType('assessment')).toBe(true);
      expect(isAgentType('practice')).toBe(true);
      expect(isAgentType('invalid')).toBe(false);
      expect(isAgentType(null)).toBe(false);
      expect(isAgentType(undefined)).toBe(false);
    });

    it('should check for valid difficulty levels', () => {
      const validDifficulties = ['easy', 'medium', 'hard'];

      const isDifficulty = (level: any): level is 'easy' | 'medium' | 'hard' => {
        return validDifficulties.includes(level);
      };

      expect(isDifficulty('easy')).toBe(true);
      expect(isDifficulty('medium')).toBe(true);
      expect(isDifficulty('hard')).toBe(true);
      expect(isDifficulty('invalid')).toBe(false);
      expect(isDifficulty(42)).toBe(false);
    });

    it('should check for valid practice types', () => {
      const validTypes = ['coding', 'conceptual', 'problem_solving', 'general'];

      const isPracticeType = (
        type: any,
      ): type is 'coding' | 'conceptual' | 'problem_solving' | 'general' => {
        return validTypes.includes(type);
      };

      expect(isPracticeType('coding')).toBe(true);
      expect(isPracticeType('conceptual')).toBe(true);
      expect(isPracticeType('problem_solving')).toBe(true);
      expect(isPracticeType('general')).toBe(true);
      expect(isPracticeType('invalid')).toBe(false);
    });
  });

  describe('Type Transformers', () => {
    it('should transform API responses to domain types', () => {
      const apiResponse = {
        id: '123',
        title: 'Test Session',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123',
      };

      const toDomainSession = (api: any) => ({
        id: api.id,
        title: api.title,
        createdAt: new Date(api.created_at),
        userId: api.user_id,
      });

      const domainSession = toDomainSession(apiResponse);

      expect(domainSession).toMatchObject({
        id: '123',
        title: 'Test Session',
        userId: 'user-123',
      });
      expect(domainSession.createdAt).toBeInstanceOf(Date);
    });

    it('should handle optional fields gracefully', () => {
      const partialData = {
        id: '123',
        title: 'Test',
        // missing optional fields
      };

      const withDefaults = (data?: unknown) => ({
        id: data.id,
        title: data.title,
        description: data.description || 'Default description',
        status: data.status || 'draft',
      });

      const result = withDefaults(partialData);

      expect(result).toMatchObject({
        id: '123',
        title: 'Test',
        description: 'Default description',
        status: 'draft',
      });
    });
  });

  describe('Type Validators', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should validate UUID format', () => {
      const isValidUUID = (uuid: string): boolean => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('123-456-789')).toBe(false);
    });

    it('should validate date strings', () => {
      const isValidDate = (dateString: string): boolean => {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && dateString.length > 0;
      };

      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('2024-01-01T00:00:00Z')).toBe(true);
      expect(isValidDate('2024/01/01')).toBe(true);
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('Type Converters', () => {
    it('should convert strings to numbers safely', () => {
      const safeParseNumber = (value: string | number, defaultValue = 0): number => {
        const parsed = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(parsed) ? defaultValue : parsed;
      };

      expect(safeParseNumber('123')).toBe(123);
      expect(safeParseNumber('45.67')).toBe(45.67);
      expect(safeParseNumber('invalid')).toBe(0);
      expect(safeParseNumber('invalid', -1)).toBe(-1);
      expect(safeParseNumber(42)).toBe(42);
    });

    it('should convert strings to booleans safely', () => {
      const safeParseBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
        }
        if (typeof value === 'number') {
          return value !== 0;
        }
        return Boolean(value);
      };

      expect(safeParseBoolean('true')).toBe(true);
      expect(safeParseBoolean('false')).toBe(false);
      expect(safeParseBoolean('1')).toBe(true);
      expect(safeParseBoolean('0')).toBe(false);
      expect(safeParseBoolean(1)).toBe(true);
      expect(safeParseBoolean(0)).toBe(false);
      expect(safeParseBoolean(null)).toBe(false);
    });
  });

  describe('Array Type Utilities', () => {
    it('should ensure array types', () => {
      const ensureArray = <T>(value: T | T[]): T[] => {
        return Array.isArray(value) ? value : [value];
      };

      expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(ensureArray(42)).toEqual([42]);
      expect(ensureArray(null)).toEqual([null]);
      expect(ensureArray(undefined)).toEqual([undefined]);
    });

    it('should deduplicate arrays', () => {
      const unique = <T>(arr: T[]): T[] => {
        return Array.from(new Set(arr));
      };

      expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should group arrays by key', () => {
      const groupBy = <T, K extends keyof T>(arr: T[], key: K): Record<string, T[]> => {
        return arr.reduce(
          (groups, item) => {
            const groupKey = String(item[key]);
            groups[groupKey] = groups[groupKey] || [];
            groups[groupKey].push(item);
            return groups;
          },
          {} as Record<string, T[]>,
        );
      };

      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ];

      const grouped = groupBy(items, 'category');

      expect(grouped).toMatchObject({
        A: [
          { id: 1, category: 'A' },
          { id: 3, category: 'A' },
        ],
        B: [{ id: 2, category: 'B' }],
      });
    });
  });

  describe('Object Type Utilities', () => {
    it('should deep clone objects', () => {
      const deepClone = <T>(obj: T): T => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
        if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as unknown as T;

        const cloned = {} as T;
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
          }
        }
        return cloned;
      };

      const original = {
        name: 'Test',
        date: new Date('2024-01-01'),
        nested: { value: 42 },
      };

      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
    });

    it('should pick specified properties', () => {
      const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
        const result = {} as Pick<T, K>;
        keys.forEach((key) => {
          if (key in obj) {
            result[key] = obj[key];
          }
        });
        return result;
      };

      const obj = { a: 1, b: 2, c: 3 };
      const picked = pick(obj, ['a', 'c']);

      expect(picked).toEqual({ a: 1, c: 3 });
    });

    it('should omit specified properties', () => {
      const omit = <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
        const result = { ...obj } as any;
        keys.forEach((key) => delete result[key]);
        return result;
      };

      const obj = { a: 1, b: 2, c: 3 };
      const omitted = omit(obj, ['b']);

      expect(omitted).toEqual({ a: 1, c: 3 });
    });
  });
});
