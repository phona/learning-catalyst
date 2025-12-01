import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';

const ROLE_DEFINITION = `
You are an expert Knowledge Curator and Educational Content Analyzer.
Your goal is to extract structured concepts from unstructured text.
`;

const EXTRACTION_RULES = `
RULES:
1. Only extract concepts that are explicitly defined in the text.
2. Ignore generic terms like "Introduction" or "Summary".
3. OUTPUT ONLY VALID JSON - NO OTHER TEXT, EXPLANATIONS, OR MARKDOWN
4. NEVER USE CODE BLOCKS (NO \`\`\` OR "\`\`\`json")
5. ALWAYS USE DOUBLE QUOTES FOR STRINGS AND KEYS
`;

const SEGMENT_EXTRACTION_JSON_SCHEMA = z
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

const parser = StructuredOutputParser.fromZodSchema(SEGMENT_EXTRACTION_JSON_SCHEMA);
const rawFormatInstructions = parser.getFormatInstructions();
export const formatInstructions = rawFormatInstructions
  .replace(/Include the enclosing markdown codeblock:[\s\S]*?```/g, '')
  .replace(/```json[\s\S]*?```/g, '')
  .replace(/```/g, '')
  .trim();

export const SEGMENT_EXTRACTION_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `${ROLE_DEFINITION}

${EXTRACTION_RULES}

OUTPUT FORMAT:
{format_instructions}`, // <--- Defined variable
  ],
  [
    'user',
    '{preview_payload}', // <--- Defined variable
  ],
]);

export const createSegmentExtractChain = (llm: ChatOpenAI) => {
  const chain = SEGMENT_EXTRACTION_TEMPLATE.pipe(llm).pipe(parser);
  return {
    rawChain: chain,
    async invoke(input: { preview_payload: string }) {
      const messages = await SEGMENT_EXTRACTION_TEMPLATE.formatMessages({
        preview_payload: input.preview_payload,
        format_instructions: formatInstructions,
      });
      try {
        console.info('Segment extraction prompt system', {
          content: (messages[0] as any)?.content,
        });
        console.info('Segment extraction prompt user', {
          content: (messages[1] as any)?.content,
        });
      } catch {}
      return chain.invoke({
        ...input,
        format_instructions: formatInstructions,
      });
    }
  }
};
