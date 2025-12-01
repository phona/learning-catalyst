// @ts-nocheck
import fs from 'node:fs/promises';
import path from 'node:path';
import { createConceptParsingService } from '../main/services/domain/concept-parsing/concept-parsing-service';
import { createPreparsedMaterial } from '../main/services/domain/content/content-preview';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const readChatGLMConfig = async () => {
  const cfg = path.resolve(process.cwd(), 'test_workspace/.catalyst/config.json');
  try {
    const raw = await fs.readFile(cfg, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const buildService = async (cfg: any) => {
  const aiService: any = {};
  const mode = process.argv[2] ?? 'json';
  let chatModel: any;
  if (mode === 'real' || mode === 'real-raw') {
    const providerName = cfg?.ai?.modelTypes?.chat?.provider;
    const model = cfg?.ai?.modelTypes?.chat?.model;
    const providerCfg = providerName ? cfg?.ai?.providers?.[providerName] : null;
    chatModel = new ChatOpenAI({
      model,
      apiKey: providerCfg?.apiKey,
      temperature: cfg?.ai?.modelTypes?.chat?.temperature ?? 0.4,
      maxTokens: cfg?.ai?.modelTypes?.chat?.maxTokens ?? 1024,
      maxRetries: 1,
      timeout: 40000,
      configuration: providerCfg?.baseUrl ? { baseURL: providerCfg.baseUrl } : undefined,
    });
  } else {
    chatModel = {
      invoke: async () => {
        if (mode === 'empty') return '';
        if (mode === 'ai-empty') return { content: '' } as any;
        if (mode === 'ai-json')
          return {
            content: JSON.stringify({
              summary: 'ok',
              focusAreas: [],
              nodes: [{ name: 'Alpha', confidence: 0.7 }],
              relationships: [],
              recommendations: [],
            }),
          } as any;
        return JSON.stringify({
          summary: 'ok',
          focusAreas: [],
          nodes: [{ name: 'Alpha', confidence: 0.7 }],
          relationships: [],
          recommendations: [],
        });
      },
    };
  }
  const domainAgent: any = { chatModel, provider: cfg?.chatglm ?? 'chatglm' };
  const captured: Array<{ title: string; content: string }> = [];
  const vectorDatabase = {
    addDocument: async (doc: any) => {
      captured.push({ title: String(doc.metadata.segmentTitle ?? ''), content: String(doc.content ?? '') });
    },
  };
  const loggerService = {
    child: () => ({ info: () => {}, debug: () => {}, warn: () => {}, error: () => {} }),
  };
  const svc = createConceptParsingService({ aiService, domainAgent, vectorDatabase, loggerService });
  return { svc, captured, chatModel, provider: domainAgent.provider };
};

const run = async () => {
  const cfg = await readChatGLMConfig();
  const { svc, captured, chatModel } = await buildService(cfg);
  const md = ['# Alpha', 'ALPHA ALPHA ALPHA', '```', '## Inside Code', '```', '## Beta', 'BETA BETA BETA'].join('\n');
  const res = await svc.parseMaterials(
    [{ id: 'm1', title: 'doc', content: md, format: 'markdown' }],
    { maxHeadingDepth: 2, maxSegmentChars: 50, minSegmentChars: 1, vectorize: true },
  );
  if ((process.argv[2] ?? '') === 'real-raw') {
    const alphaContent = ['# Alpha', 'ALPHA ALPHA ALPHA', '```', '## Inside Code', '```'].join('\n');
    const previewAlpha = createPreparsedMaterial(alphaContent, { sourceLabel: 'alpha', maxHeadingDepth: 2 });
    const schema = z
      .object({
        summary: z.string(),
        focusAreas: z.array(z.string()),
        nodes: z.array(
          z
            .object({
              name: z.string(),
              description: z.string().nullable().optional(),
              type: z.string().nullable().optional(),
              difficulty: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
              confidence: z.number().nullable().optional(),
              tags: z.array(z.string()).nullable().optional(),
              metadata: z.record(z.unknown()).nullable().optional(),
            })
            .strict()
            .required({ name: true }),
        ),
        relationships: z.array(
          z
            .object({
              from: z.string(),
              to: z.string(),
              type: z.string().nullable().optional(),
              strength: z.number().nullable().optional(),
              confidence: z.number().nullable().optional(),
              description: z.string().nullable().optional(),
              metadata: z.record(z.unknown()).nullable().optional(),
            })
            .strict()
            .required({ from: true, to: true }),
        ),
        recommendations: z.array(z.string()),
      })
      .strict()
      .required({
        summary: true,
        focusAreas: true,
        nodes: true,
        relationships: true,
        recommendations: true,
      });
    const formatInstructions = "You must output valid JSON matching the required schema.";
    const template = ChatPromptTemplate.fromMessages([
      [
        'system',
        'Extract structured concepts and relationships strictly as JSON.',
      ],
      [
        'user',
        '{preview_payload}',
      ],
    ]);
    const messages = await template.formatMessages({ preview_payload: JSON.stringify({
      source: previewAlpha.source,
      stats: previewAlpha.stats,
      outline: previewAlpha.outline,
      snippets: previewAlpha.snippets,
    }), format_instructions: formatInstructions });
    const raw = await (chatModel as any).invoke(messages as any);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ raw: typeof raw === 'string' ? raw : (raw as any)?.content ?? raw }, null, 2));
  }
  const preview = createPreparsedMaterial(md, { sourceLabel: 'smoke', maxHeadingDepth: 2 });
  const bugDetected = !res.success && res.errors.length > 0;
  const info = {
    chatglm: cfg?.chatglm ?? null,
    mode: process.argv[2] ?? 'json',
    success: res.success,
    errors: res.errors,
    stats: res.statistics,
    concepts: res.concepts.map((c) => ({ name: c.name, confidence: c.confidence, title: c.metadata.segmentTitle })),
    chunkTitles: captured.map((d) => d.title),
    outline: preview.outline,
    bugDetected,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(info, null, 2));
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(String(err));
  process.exit(1);
});
