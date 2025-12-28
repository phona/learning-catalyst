import { describe, it, expect, vi } from 'vitest';
import { buildParsingSettings } from '../concept-parsing-handlers';
import type { ConfigService } from '@/main/services/core/config/config-service';

describe('buildParsingSettings', () => {
  it('pulls parsing defaults from config and forces vectorize', async () => {
    const get = vi.fn(async (key: string) => {
      if (key === 'ui') return { documentHeadingDepth: 3 };
      if (key === 'parsing') {
        return {
          maxSegmentChars: 1500,
          minSegmentChars: 120,
          maxConcurrentSegments: 5,
          vectorize: false,
        };
      }
      return undefined;
    });
    const configService = { get } as unknown as ConfigService;

    const settings = await buildParsingSettings(
      {
        userId: 'user-1',
        options: { confidenceThreshold: 0.75, maxConceptsPerFile: 10 },
      },
      configService,
    );

    expect(settings.maxHeadingDepth).toBe(3);
    expect(settings.maxSegmentChars).toBe(1500);
    expect(settings.minSegmentChars).toBe(120);
    expect(settings.options?.maxConcurrentSegments).toBe(5);
    // vectorize should be forced on even when config says false
    expect(settings.vectorize).toBe(true);
  });
});
