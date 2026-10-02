/**
 * POST /api/debrief
 *
 * This runs on the server, not in the browser. That is the whole point:
 * the API key lives in an environment variable here and is never sent to
 * the client, so opening DevTools on the deployed page reveals nothing.
 *
 * Set ONE of these in the Vercel project's environment variables:
 *   ANTHROPIC_API_KEY  — from console.anthropic.com
 *   OPENAI_API_KEY     — from platform.openai.com
 *
 * If neither is set the endpoint returns 501 and the app falls back to
 * the copy-prompt button. That is deliberate: the tool must stay useful
 * without an AI account attached.
 */

const MAX_FACTS_LENGTH = 8000;
const MAX_OUTPUT_TOKENS = 700;

// Crude in-memory rate limit. Serverless instances are recycled, so this
// is a speed bump rather than a guarantee — the real protection is the
// spend cap set in the provider console.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const record = hits.get(key) || { count: 0, start: now };
  if (now - record.start > RATE_LIMIT_WINDOW_MS) {
    hits.set(key, { count: 1, start: now });
    return false;
  }
  record.count += 1;
  hits.set(key, record);
  return record.count > RATE_LIMIT_MAX;
}

async function callAnthropic({ system, prompt, apiKey }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return { text, usage: data.usage || null, provider: 'anthropic' };
}

async function callOpenAI({ system, prompt, apiKey }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI API returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  return { text, usage: data.usage || null, provider: 'openai' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openaiKey) {
    return res.status(501).json({
      error: 'No AI provider is configured on this deployment.',
      hint: 'Set ANTHROPIC_API_KEY or OPENAI_API_KEY in the project environment variables.',
    });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown';

  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ error: 'Too many debriefs in a short window. Wait a minute and try again.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Body must be JSON.' });
    }
  }

  const { system, facts } = body || {};

  if (typeof facts !== 'string' || facts.trim().length < 20) {
    return res.status(400).json({ error: 'Missing event data.' });
  }
  if (facts.length > MAX_FACTS_LENGTH) {
    return res.status(413).json({ error: 'Event data is too long.' });
  }
  if (typeof system !== 'string' || system.length < 20) {
    return res.status(400).json({ error: 'Missing instructions.' });
  }

  const prompt = `Here is the data for one event. Write the debrief.\n\n${facts}`;

  try {
    const result = anthropicKey
      ? await callAnthropic({ system, prompt, apiKey: anthropicKey })
      : await callOpenAI({ system, prompt, apiKey: openaiKey });

    if (!result.text) {
      return res.status(502).json({ error: 'The AI provider returned an empty response.' });
    }

    return res.status(200).json({
      debrief: result.text,
      provider: result.provider,
      usage: result.usage,
    });
  } catch (err) {
    // Never leak the key or the full upstream body to the client.
    console.error('[debrief] upstream failure:', err.message);
    return res.status(502).json({
      error: 'The AI provider could not be reached. Use the copy-prompt option below instead.',
    });
  }
}
