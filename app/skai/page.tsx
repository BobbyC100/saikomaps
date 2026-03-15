'use client';

import { FormEvent, useState } from 'react';

type AskMode = 'answer' | 'learn';
type AskDepth = 'short' | 'standard' | 'detailed';

interface AskResponse {
  answer: string;
  citations: Array<{ doc_id: string }>;
  retrieved_count: number;
  mode: AskMode;
  depth: AskDepth;
}

export default function SkaiPage() {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<AskMode>('answer');
  const [depth, setDepth] = useState<AskDepth>('standard');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/skai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          mode,
          depth,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = typeof body.error === 'string' ? body.error : 'Failed to get SKAI answer';
        throw new Error(message);
      }

      const body = (await response.json()) as AskResponse;
      setResult(body);
    } catch (submitError) {
      setResult(null);
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 840, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>SKAI</h1>
      <p style={{ marginBottom: '1rem', color: '#444' }}>
        Ask one question at a time. Switch between disciplined answer mode and teaching-focused learn mode.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
        <label htmlFor="skai-question" style={{ fontWeight: 600 }}>
          Question
        </label>
        <textarea
          id="skai-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          placeholder="Ask SKAI a question..."
          style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: 6 }}
        />

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label>
            Mode{' '}
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as AskMode)}
              style={{ marginLeft: '0.35rem' }}
            >
              <option value="answer">answer</option>
              <option value="learn">learn</option>
            </select>
          </label>

          <label>
            Depth{' '}
            <select
              value={depth}
              onChange={(event) => setDepth(event.target.value as AskDepth)}
              style={{ marginLeft: '0.35rem' }}
            >
              <option value="short">short</option>
              <option value="standard">standard</option>
              <option value="detailed">detailed</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          style={{
            width: 'fit-content',
            padding: '0.55rem 0.85rem',
            borderRadius: 6,
            border: '1px solid #222',
            background: isLoading ? '#f3f3f3' : '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Asking SKAI...' : 'Ask SKAI'}
        </button>
      </form>

      {error ? (
        <section style={{ border: '1px solid #f2b8b8', background: '#fff5f5', padding: '0.75rem', borderRadius: 6 }}>
          <strong>Error: </strong>
          {error}
        </section>
      ) : null}

      {result ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ fontSize: '0.92rem', color: '#555' }}>
            <strong>Mode:</strong> {result.mode} | <strong>Depth:</strong> {result.depth} |{' '}
            <strong>Retrieved chunks:</strong> {result.retrieved_count}
          </div>

          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Response</h2>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                margin: 0,
                padding: '0.85rem',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: '#fafafa',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
              }}
            >
              {result.answer}
            </pre>
          </div>

          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Citations</h2>
            {result.citations.length === 0 ? (
              <p style={{ margin: 0 }}>No citations returned.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {result.citations.map((citation) => (
                  <li key={citation.doc_id}>
                    <code>{citation.doc_id}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
