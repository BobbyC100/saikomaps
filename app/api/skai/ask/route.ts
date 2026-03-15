import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { queryKnowledge } from '@/lib/skai/query';

interface AskRequestBody {
  question?: string;
  topK?: number;
  category?: string;
  systems?: string[];
  mode?: 'answer' | 'learn';
  depth?: 'short' | 'standard' | 'detailed';
}

interface Citation {
  doc_id: string;
}

const SECTION_HEADINGS = [
  'Direct answer',
  'What the docs explicitly say',
  'What is strongly supported by the docs (only if needed)',
  'What is inferred from the docs (only if needed)',
  'Uncertainty or conflicts (only if present)',
] as const;

interface StructuredAnswer {
  direct_answer?: string;
  explicit?: string;
  strongly_supported?: string;
  inferred?: string;
  uncertainty?: string;
}

type AskMode = 'answer' | 'learn';
type AskDepth = 'short' | 'standard' | 'detailed';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function toContextBlock(chunks: Awaited<ReturnType<typeof queryKnowledge>>): string {
  return chunks
    .map((chunk, idx) => {
      const n = idx + 1;
      return [
        `Chunk ${n}`,
        `doc_id: ${chunk.doc_id}`,
        `similarity: ${chunk.similarity.toFixed(4)}`,
        `content:`,
        chunk.content,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

function uniqueDocIds(chunks: Awaited<ReturnType<typeof queryKnowledge>>): string[] {
  return [...new Set(chunks.map((chunk) => chunk.doc_id))];
}

function extractDocIdsFromAnswer(answer: string, allowedDocIds: Set<string>): string[] {
  const ids = new Set<string>();
  const matches = answer.matchAll(/\[([A-Za-z0-9/_-]+)\]/g);
  for (const match of matches) {
    const id = match[1];
    if (allowedDocIds.has(id)) ids.add(id);
  }
  return [...ids];
}

function hasAllowedCitation(text: string, allowedDocIds: Set<string>): boolean {
  return extractDocIdsFromAnswer(text, allowedDocIds).length > 0;
}

function normalizeAnswerHeadings(answer: string): string {
  const headingMatchers: ReadonlyArray<{ heading: string; pattern: RegExp }> = [
    {
      heading: SECTION_HEADINGS[0],
      pattern: /^\s{0,3}(?:#+\s*)?(?:\d+\.\s*)?direct answer\s*:?\s*$/i,
    },
    {
      heading: SECTION_HEADINGS[1],
      pattern: /^\s{0,3}(?:#+\s*)?(?:\d+\.\s*)?what the docs explicitly say\s*:?\s*$/i,
    },
    {
      heading: SECTION_HEADINGS[2],
      pattern:
        /^\s{0,3}(?:#+\s*)?(?:\d+\.\s*)?what is strongly supported by the docs(?:\s*\(only if needed\))?\s*:?\s*$/i,
    },
    {
      heading: SECTION_HEADINGS[3],
      pattern:
        /^\s{0,3}(?:#+\s*)?(?:\d+\.\s*)?what is inferred from the docs(?:\s*\(only if needed\))?\s*:?\s*$/i,
    },
    {
      heading: SECTION_HEADINGS[4],
      pattern:
        /^\s{0,3}(?:#+\s*)?(?:\d+\.\s*)?uncertainty or conflicts(?:\s*\(only if present\))?\s*:?\s*$/i,
    },
  ];

  return answer
    .split('\n')
    .map((line) => {
      const match = headingMatchers.find(({ pattern }) => pattern.test(line));
      return match ? match.heading : line;
    })
    .join('\n')
    .trim();
}

function extractJsonObject(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return raw.slice(firstBrace, lastBrace + 1).trim();
}

function parseStructuredAnswer(raw: string): StructuredAnswer | null {
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr) as StructuredAnswer;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.direct_answer !== 'string' ||
      typeof parsed.explicit !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function formatStructuredAnswer(answer: StructuredAnswer, allowedDocIds: Set<string>): string {
  const sections: string[] = [];
  const addSection = (heading: string, body?: string) => {
    const text = body?.trim();
    if (!text || !hasAllowedCitation(text, allowedDocIds)) return;
    sections.push(`${heading}\n\n${text}`);
  };

  addSection(SECTION_HEADINGS[0], answer.direct_answer);
  addSection(SECTION_HEADINGS[1], answer.explicit);
  addSection(SECTION_HEADINGS[2], answer.strongly_supported);
  addSection(SECTION_HEADINGS[3], answer.inferred);
  addSection(SECTION_HEADINGS[4], answer.uncertainty);

  return sections.join('\n\n');
}

function depthGuidance(depth: AskDepth): string {
  switch (depth) {
    case 'short':
      return 'Target 2 short paragraphs. Keep it concise and clear.';
    case 'detailed':
      return 'Target 6-9 paragraphs with fuller teaching detail and clear progression.';
    case 'standard':
    default:
      return 'Target 3-5 paragraphs with moderate explanation depth.';
  }
}

async function generateGroundedStructuredAnswer(question: string, contextBlock: string): Promise<string> {
  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 900,
    system: [
      'You are the SKAI answer layer.',
      'Use only the provided SKAI context chunks as evidence.',
      'Do not use general knowledge, assumptions, or user framing to fill gaps.',
      'Do not agree with or validate user claims unless the chunks explicitly support them.',
      'Prefer the clearest and best-supported framing from the retrieved chunks.',
      'Classify every claim before writing using four states: A) explicitly documented, B) strongly supported by retrieved architecture, C) inferred from retrieved docs, D) not documented.',
      'Keep B and C distinct: B requires strong architectural support from retrieved docs; C is a narrower, minimal derivation from retrieved evidence and is weaker than B.',
      'Use "That\'s not documented yet." only for state D: when retrieved docs neither explicitly state nor strongly support a responsible conclusion.',
      'Do not collapse B into A or D.',
      'Do not use user framing as evidence.',
      'If B applies, provide a responsible non-explicit conclusion and label it as strongly supported.',
      'If C applies, label it as inferred and keep it concise.',
      'If evidence is partial, say that it is partial and limit claims accordingly.',
      'If docs conflict, surface the conflict explicitly and cite each conflicting source.',
      'Inference rules: derive inference directly from retrieved evidence, keep it short (max 2 sentences), make it explicit, omit weak inference instead of padding, and avoid soft interpretive filler or cultural commentary.',
      'Citation anchoring rule: every non-empty section must contain at least one inline citation to retrieved docs.',
      'If you cannot support a section with an inline citation from retrieved docs, return that section as an empty string.',
      'This applies to all sections and especially "strongly_supported" and "inferred".',
      'Cite factual statements inline with square-bracket doc IDs from retrieved chunks only, e.g. [SKAI/RETRIEVAL-LAYER-V1].',
      'Do not cite any doc_id that is not present in the provided context.',
      'Return JSON only (no markdown, no prose outside JSON) with keys:',
      '{',
      '  "direct_answer": string,',
      '  "explicit": string,',
      '  "strongly_supported": string,',
      '  "inferred": string,',
      '  "uncertainty": string',
      '}',
      'Set optional/unused fields to an empty string.',
      'Do not output heading text; the server formats headings.',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: [`Question:\n${question}`, '', 'SKAI context chunks:', contextBlock].join('\n'),
      },
    ],
  });

  return completion.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

async function generateLearnAnswer(params: {
  question: string;
  depth: AskDepth;
  contextBlock: string;
  groundedStructured: StructuredAnswer | null;
  groundedAnswer: string;
}): Promise<string> {
  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1400,
    system: [
      'You are the SKAI learn-mode explainer.',
      'Your job is to transform a grounded SKAI answer into a teachable long-form explanation.',
      'Stay strictly bounded by the provided grounded answer and context chunks.',
      'Do not introduce any claim that is not explicitly documented or strongly supported by the provided evidence.',
      'Do not use user framing, general knowledge, speculation, or cultural commentary.',
      'Explain clearly and read-aloud friendly.',
      'Prioritize this order: what this is, why it exists, how it works, important parts, what to remember.',
      'Define terms simply when useful.',
      'Every paragraph must include at least one inline citation using retrieved doc IDs only.',
      'If a point cannot be cited, omit that point.',
      'Output plain text only (no JSON, no markdown headings, no bullets).',
      depthGuidance(params.depth),
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: [
          `Question:\n${params.question}`,
          '',
          'Grounded answer object (source material):',
          JSON.stringify(params.groundedStructured ?? {}, null, 2),
          '',
          'Grounded formatted answer (source material):',
          params.groundedAnswer,
          '',
          'SKAI context chunks:',
          params.contextBlock,
        ].join('\n'),
      },
    ],
  });

  return completion.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AskRequestBody;
    const question = body.question?.trim();
    const mode: AskMode = body.mode ?? 'answer';
    const depth: AskDepth = body.depth ?? 'standard';

    if (!question) {
      return NextResponse.json(
        { error: 'question is required' },
        { status: 400 },
      );
    }
    if (!['answer', 'learn'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode must be one of: answer, learn' },
        { status: 400 },
      );
    }
    if (!['short', 'standard', 'detailed'].includes(depth)) {
      return NextResponse.json(
        { error: 'depth must be one of: short, standard, detailed' },
        { status: 400 },
      );
    }

    const chunks = await queryKnowledge({
      question,
      topK: body.topK,
      category: body.category,
      systems: body.systems,
    });

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: 'I could not find relevant SKAI documents for that question.',
        citations: [] as Citation[],
        retrieved_count: 0,
        mode,
        depth,
      });
    }

    const contextBlock = toContextBlock(chunks);
    const allowedDocIds = new Set(uniqueDocIds(chunks));
    const rawAnswer = await generateGroundedStructuredAnswer(question, contextBlock);
    const structured = parseStructuredAnswer(rawAnswer);
    const groundedAnswer = structured
      ? formatStructuredAnswer(structured, allowedDocIds)
      : normalizeAnswerHeadings(rawAnswer);
    let answer = groundedAnswer;

    if (mode === 'learn') {
      const learnAnswer = await generateLearnAnswer({
        question,
        depth,
        contextBlock,
        groundedStructured: structured,
        groundedAnswer,
      });
      answer = hasAllowedCitation(learnAnswer, allowedDocIds) ? learnAnswer : groundedAnswer;
    }

    const citedDocIds = extractDocIdsFromAnswer(answer, allowedDocIds);
    const fallbackDocIds = citedDocIds.length > 0 ? citedDocIds : [...allowedDocIds];

    return NextResponse.json({
      answer,
      citations: fallbackDocIds.map((doc_id) => ({ doc_id })),
      retrieved_count: chunks.length,
      mode,
      depth,
    });
  } catch (error) {
    console.error('[SKAI Ask] Error:', error);
    return NextResponse.json(
      { error: 'Failed to answer SKAI question' },
      { status: 500 },
    );
  }
}
