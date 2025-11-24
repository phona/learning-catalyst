import { describe, expect, it } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { createMockElectronAPI, ok, fail } from '@/test/utils/electron-api-fixture';

const validContent = '# Title\n\nThis is a sample content with enough length to be valid for parsing.';

describe('concept-parsing-service', () => {
  it('validates content length and markdown detection', async () => {
    const svc = createConceptParsingService(createMockElectronAPI() as ElectronAPI);
    await expect(svc.parseContent('short')).rejects.toThrow(/Content validation failed/);
    // should succeed for valid content
    await svc.parseContent(validContent);
  });

  it('propagates API errors from parseContent', async () => {
    const api = createMockElectronAPI({
      knowledge: { parseConcepts: async () => fail('nope') } as any,
    });
    const svc = createConceptParsingService(api as ElectronAPI);
    await expect(svc.parseContent(validContent)).rejects.toThrow(/nope/);
  });

  it('returns jobs for parseFiles and parseDirectories and exposes status', async () => {
    const api = createMockElectronAPI({
      knowledge: {
        parseConcepts: async () =>
          ok({
            success: true,
            concepts: [],
            relationships: [],
            statistics: { totalConcepts: 0 } as any,
            errors: [],
            metadata: { processingTime: 0, processedAt: new Date().toISOString(), inputFiles: 1 },
          }),
      } as any,
      readFile: async () => validContent,
      readDirectory: async () => [],
    });
    const svc = createConceptParsingService(api as ElectronAPI);
    const job = await svc.parseFiles(['file1.md']);
    const job2 = await svc.parseDirectories(['dir1']);
    expect(job.status).toBe('pending');
    expect(job2.id).toBeDefined();
    const status = svc.getJobStatus(job.id);
    expect(status?.id).toBe(job.id);
    const jobs = svc.listActiveJobs();
    expect(jobs.length).toBeGreaterThan(0);
    const cancelled = svc.cancelJob(job.id);
    expect(typeof cancelled).toBe('boolean');
  });
});
