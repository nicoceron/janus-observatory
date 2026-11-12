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

const studyNames: Record<string, string> = {
  'JANUS-PAPER-01': 'Scenario study',
  'JANUS-PAPER-02': 'Limits-to-growth study',
  'JANUS-PAPER-03': 'Observing study',
  'JANUS-PAPER-04': 'Governance study',
  'JANUS-PAPER-05': 'Collapse study',
};

const answerLabels: Record<Answer['kind'], string> = {
  answer: 'Answer',
  refusal: 'Outside what the studies can answer',
  no_evidence: 'Not covered by the studies',
};

export function ResearchCompanion({
  maximumCharacters,
  suggestions,
}: {
  maximumCharacters: number;
  suggestions: string[];
}) {
  const questionId = useId();
  const [question, setQuestion] = useState(suggestions[0] ?? '');
  const [status, setStatus] = useState('Ask anything about the ten futures.');
  const [answer, setAnswer] = useState<Answer>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setAnswer(undefined);
    setError(undefined);
    setStatus('Searching the studies…');
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? 'The question couldn’t be answered. Try again shortly.');
      }
      if (!response.body) throw new Error('The answer didn’t arrive. Try again shortly.');

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
              item.data.audit.passed
                ? 'Answer ready, with sources.'
                : 'Some of this answer couldn’t be matched to a source.',
            );
          }
          if (item.type === 'error') throw new Error(item.message);
        }
        if (done) break;
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'The question couldn’t be answered. Try again.',
      );
      setStatus('No answer this time.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.companion} aria-labelledby="companion-title">
      <div className={styles.companionIntro}>
        <h2 id="companion-title">Ask the studies.</h2>
        <p>
          Answers come only from the Project Janus papers and cite the pages they use. If the papers
          don’t cover a question, it says so. Questions aren’t stored.
        </p>
        <div className={styles.suggestions} aria-label="Suggested research questions">
          {suggestions.map((suggestion) => (
            <button
              disabled={loading}
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
        <label htmlFor={questionId}>Your question</label>
        <textarea
          disabled={loading}
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
          <button disabled={loading || question.trim().length < 8} type="submit">
            {loading ? 'Searching…' : 'Ask'}
          </button>
        </div>
        <p aria-live="polite" className={styles.liveStatus} role="status">
          <span aria-hidden="true" /> {status}
        </p>
        {error ? <p className={styles.errorNotice}>{error}</p> : null}
      </form>

      {answer ? (
        <article className={styles.answer} aria-label="Answer">
          <div className={styles.answerHeader}>
            <span>{answerLabels[answer.kind]}</span>
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
                      {studyNames[citation.sourceId] ?? citation.sourceId}, p. {citation.pageStart}
                    </a>
                  ) : (
                    <span>
                      {studyNames[citation.sourceId] ?? citation.sourceId}, p. {citation.pageStart}
                    </span>
                  )}
                  <small>{citation.heading}</small>
                </li>
              ))}
            </ol>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
