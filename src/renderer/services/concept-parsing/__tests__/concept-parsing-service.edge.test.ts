import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createConceptParsingService } from '@/renderer/services/concept-parsing/concept-parsing-service';

const baseApi = {
  knowledge: {
    parseConcepts: vi.fn(),
  },
  existsFile: vi.fn(),
  readFile: vi.fn(),
  readDirectory: vi.fn(),
};

const buildService = () => createConceptParsingService(baseApi as any);

describe('concept-parsing-service edge cases', () => {
  it('rejects empty or short content', async () => {
    const service = buildService();
    await expect(service.parseContent('')).rejects.toThrow(/validation failed/i);
    await expect(service.parseContent('short text')).rejects.toThrow(/too short/i);
  });

  it('rejects overlong content', async () => {
    const service = buildService();
    const long = 'x'.repeat(100_001);
    await expect(service.parseContent(long)).rejects.toThrow(/too long/i);
  });

  it('marks job as failed when no valid markdown files are found', async () => {
    baseApi.existsFile.mockResolvedValue(false);
    const service = buildService();

    const job = await service.parseFiles(['a.md']);

    await waitFor(() =>
      expect(service.getJobStatus(job.id)?.status).toBe<'failed'>('failed'),
    );
    expect(service.getJobStatus(job.id)?.errorMessage).toMatch(/No valid files/i);
  });

  it('marks directory job as failed when no markdown files', async () => {
    baseApi.readDirectory.mockResolvedValueOnce([]);
    const service = buildService();

    const job = await service.parseDirectories(['./tmp']);

    await waitFor(() =>
      expect(service.getJobStatus(job.id)?.status).toBe<'failed'>('failed'),
    );
    expect(service.getJobStatus(job.id)?.errorMessage).toMatch(/No markdown files/i);
  });

  it('ignores invalid files and logs warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    baseApi.existsFile.mockResolvedValue(true);
    baseApi.readFile.mockResolvedValue('not markdown content but long enough to pass length');
    baseApi.knowledge.parseConcepts.mockResolvedValue({
      success: true,
      data: { concepts: [], relationships: [] },
    });

    const service = buildService();
    const job = await service.parseFiles(['note.txt']);

    await waitFor(() =>
      expect(service.getJobStatus(job.id)?.status).toBe<'failed'>('failed'),
    );
    expect(service.getJobStatus(job.id)?.errorMessage).toMatch(/No valid files/i);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
