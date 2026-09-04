'use client';

import { useId, useState, type FormEvent } from 'react';

import styles from './Research.module.css';

type Citation = {
  chunkId: string;
  sourceId: string;
  sourceVersion: string;
  pageStart: number;
  pageEnd: number;
  heading: string;
  url?: string;
};

type Answer = {
  kind: 'answer' | 'refusal' | 'no_evidence';
  answer: string;
  citations: Citation[];
  generationMode: 'deterministic' | 'provider';
  providerFallback: boolean;
  toolCalls: Array<{
    callId: string;
    name: string;
    status: 'ok' | 'unavailable';
    resultHash: string;
  }>;
  audit: { passed: boolean; factualParagraphs: number; citedParagraphs: number };
};

type StreamEvent =
  | { type: 'status'; stage: string; label: string }
  | { type: 'answer'; data: Answer }
  | { type: 'error'; error: string; message: string };

export function ResearchCompanion({
  enabled,
  maximumCharacters,
  suggestions,
}: {
  enabled: boolean;
  maximumCharacters: number;
  suggestions: string[];
}) {
  const questionId = useId();
  const [question, setQuestion] = useState(suggestions[0] ?? '');
  const [status, setStatus] = useState(
    enabled ? 'Ready for a bounded question.' : 'Preview disabled.',
  );
  const [answer, setAnswer] = useState<Answer>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || loading) return;
    setLoading(true);
    setAnswer(undefined);
    setError(undefined);
    setStatus('Bounding request…');
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? `Research request failed with HTTP ${response.status}.`);
      }
      if (!response.body) throw new Error('The research response stream was unavailable.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines.filter(Boolean)) {
          const item = JSON.parse(line) as StreamEvent;
          if (item.type === 'status') setStatus(item.label);
          if (item.type === 'answer') {
            setAnswer(item.data);
            setStatus(
              item.data.audit.passed ? 'Answer and citations audited.' : 'Audit failed closed.',
            );
          }
          if (item.type === 'error') throw new Error(item.message);
        }
        if (done) break;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed closed.');
      setStatus('No answer released.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.companion} aria-labelledby="companion-title">
      <div className={styles.companionIntro}>
        <p className={styles.kicker}>Ask the corpus</p>
        <h2 id="companion-title">A cited answer—or an honest stop.</h2>
        <p>
          Questions are limited to the approved corpus and deterministic Janus records. The service
          does not store raw questions by default.
        </p>
        <div className={styles.suggestions} aria-label="Suggested research questions">
          {suggestions.map((suggestion) => (
            <button
              disabled={!enabled || loading}
              key={suggestion}
              onClick={() => setQuestion(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <form className={styles.askForm} onSubmit={submit}>
        <label htmlFor={questionId}>Research question</label>
        <textarea
          disabled={!enabled || loading}
          id={questionId}
          maxLength={maximumCharacters}
          onChange={(event) => setQuestion(event.target.value)}
          required
          rows={5}
          value={question}
        />
        <div className={styles.formMeta}>
          <span>
            {question.length} / {maximumCharacters}
          </span>
          <button disabled={!enabled || loading || question.trim().length < 8} type="submit">
            {loading ? 'Auditing…' : enabled ? 'Search evidence' : 'Preview held closed'}
          </button>
        </div>
        <p aria-live="polite" className={styles.liveStatus} role="status">
          <span aria-hidden="true" /> {status}
        </p>
        {error ? <p className={styles.errorNotice}>{error}</p> : null}
      </form>

      {answer ? (
        <article className={styles.answer} aria-label="Cited research answer">
          <div className={styles.answerHeader}>
            <span>{answer.kind.replace('_', ' ')}</span>
            <span>
              {answer.generationMode}
              {answer.providerFallback ? ' · safe fallback' : ''}
              {` · ${answer.toolCalls.length} bounded calls`}
            </span>
          </div>
          <div className={styles.answerCopy}>
            {answer.answer.split(/\n{2,}/).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {answer.citations.length > 0 ? (
            <ol className={styles.citations}>
              {answer.citations.map((citation) => (
                <li key={citation.chunkId}>
                  {citation.url ? (
                    <a href={citation.url} rel="noreferrer" target="_blank">
                      {citation.sourceId} · p. {citation.pageStart}
                    </a>
                  ) : (
                    <span>
                      {citation.sourceId} · p. {citation.pageStart}
                    </span>
                  )}
                  <small>{citation.heading}</small>
                </li>
              ))}
            </ol>
          ) : null}
          <details className={styles.toolReceipt}>
            <summary>Inspect deterministic tool receipt</summary>
            <ol>
              {answer.toolCalls.map((toolCall) => (
                <li key={toolCall.callId}>
                  <span>{toolCall.name.replaceAll('_', ' ')}</span>
                  <small>
                    {toolCall.status} · {toolCall.resultHash.slice(0, 21)}…
                  </small>
                </li>
              ))}
            </ol>
          </details>
        </article>
      ) : null}
    </section>
  );
}
