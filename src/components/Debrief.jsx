/**
 * The AI debrief.
 *
 * Two routes, and the second always works:
 *   1. Generate — posts the computed numbers to /api/debrief, which holds
 *      the key server-side.
 *   2. Copy prompt — puts the same instruction and data on the clipboard
 *      to paste into ChatGPT or Claude. No account or key needed.
 *
 * The model never calculates anything. Every figure in the prompt was
 * already computed by calc.js.
 */

import { useState } from 'react';
import { Card, Button, Note } from './ui.jsx';
import { buildFacts, buildPastablePrompt, SYSTEM_INSTRUCTION } from '../lib/prompt.js';

function renderDebrief(text) {
  const blocks = text.split('\n');
  return blocks.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={i} className="mt-4 mb-1.5 text-sm font-medium text-haus-pink-dark first:mt-0">
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.startsWith('#')) {
      return (
        <h3 key={i} className="mt-4 mb-1.5 text-sm font-medium text-haus-pink-dark first:mt-0">
          {trimmed.replace(/^#+\s*/, '')}
        </h3>
      );
    }
    if (/^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      return (
        <div key={i} className="flex gap-2 py-0.5 text-sm text-ink">
          <span className="text-haus-pink">•</span>
          <span>{trimmed.replace(/^([-*]|\d+[.)])\s+/, '')}</span>
        </div>
      );
    }
    return (
      <p key={i} className="py-0.5 text-sm leading-relaxed text-ink">
        {trimmed}
      </p>
    );
  });
}

export default function Debrief({ plan, result, be, comparison }) {
  const [state, setState] = useState('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const facts = buildFacts(plan, result, be, comparison);
  const pastable = buildPastablePrompt(plan, result, be, comparison);
  const hasData = (plan.tiers || []).length > 0 && result.guests >= 0;

  async function generate() {
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/debrief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ system: SYSTEM_INSTRUCTION, facts }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.error ||
            'The debrief service is not available on this deployment. Use the copy option below.'
        );
        setState('error');
        return;
      }
      setText(data.debrief || '');
      setState('done');
    } catch {
      setError(
        'Could not reach the debrief service. If you are running this locally without Vercel, use the copy option below.'
      );
      setState('error');
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(pastable);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowPrompt(true);
    }
  }

  return (
    <Card
      title="AI debrief"
      subtitle="A written read on the numbers above — what happened, why, and what to change."
    >
      {!hasData && (
        <Note level="info">Add ticket tiers and costs first, then generate a debrief.</Note>
      )}

      {hasData && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} disabled={state === 'loading'}>
              {state === 'loading' ? 'Writing…' : 'Generate debrief'}
            </Button>
            <Button variant="secondary" onClick={copyPrompt}>
              {copied ? 'Copied' : 'Copy prompt for ChatGPT'}
            </Button>
            {text && (
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard?.writeText(text)}
              >
                Copy debrief
              </Button>
            )}
          </div>

          <p className="mt-2.5 text-xs text-ink-faint">
            All figures are calculated by this tool before being sent. The AI writes the
            explanation; it never does the math.
          </p>

          {state === 'error' && (
            <div className="mt-4">
              <Note level="warning">{error}</Note>
            </div>
          )}

          {state === 'done' && text && (
            <div className="mt-4 rounded-xl border border-line bg-white p-4">
              {renderDebrief(text)}
            </div>
          )}

          {showPrompt && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-ink-soft">
                Clipboard access was blocked. Select this text and copy it manually:
              </p>
              <textarea
                readOnly
                value={pastable}
                rows={10}
                className="w-full rounded-lg border border-line bg-white p-3 font-mono text-xs text-ink"
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
