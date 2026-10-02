# Event Profit Planner

Built by Atelier Consulting Solutions for GirlHaus.

Tells you whether an event makes money **before** you spend anything, then records
what actually happened so the next plan is better than the last.

---

## Running it on your machine

You need Node 18 or newer.

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

Other commands:

```bash
npm test      # runs the calculation checks — do this after touching src/lib/calc.js
npm run build # production build into dist/
npm run preview
```

---

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. Go to vercel.com, **Add New → Project**, and import that repository.
3. Vercel detects Vite automatically. Leave the build settings alone.
4. Click **Deploy**.

You get a live URL. Every push to the main branch redeploys automatically.

### Turning on the AI debrief

The debrief works without any setup — the **Copy prompt for ChatGPT** button puts a
fully formatted prompt on the clipboard, ready to paste anywhere.

To make the **Generate debrief** button work inside the app, add an API key to the
Vercel project:

1. In Vercel, open the project → **Settings → Environment Variables**
2. Add **one** of these:
   - `ANTHROPIC_API_KEY` — from console.anthropic.com
   - `OPENAI_API_KEY` — from platform.openai.com
3. Redeploy.

Optional overrides: `ANTHROPIC_MODEL`, `OPENAI_MODEL`.

**Set a spend cap in the provider console before adding the key.** At this tool's
volume the cost is cents per month, but a cap means a mistake can never become a bill.

The key lives only in Vercel's environment and is read server-side by
`api/debrief.js`. It is never sent to the browser, so nobody can read it by opening
DevTools on the live site. **Never put a key in a `.env` file that gets committed,
and never put one in `src/`.**

---

## How it works

```
src/lib/calc.js     All the math. Pure functions, no framework, no AI.
src/lib/prompt.js   Turns computed numbers into the debrief prompt.
src/lib/storage.js  Browser storage plus JSON file import/export.
src/lib/defaults.js Starting templates. Every line is editable in the app.
src/components/     UI.
api/debrief.js      Serverless function. Holds the API key server-side.
```

### The one rule

**`calc.js` does every calculation. The AI only writes prose.**

The prompt sent to the model contains figures that have already been computed, and
instructs it not to do arithmetic. If a model ever produced a number, it could be
wrong and nobody would catch it. Keep this separation.

### Changing the math

Edit `src/lib/calc.js`, then run `npm test`. The test file checks the engine against
the real RnB Masquerade result — if that check stops passing, the change is wrong.

---

## Replacing the placeholder data

The amounts in `src/lib/defaults.js` are estimates that add up to GirlHaus's known
masquerade totals (roughly $5,000 spent, $2,000 taken in). They exist so the form
isn't blank on first open.

When the real line items are available:

1. Update the amounts in `EVENT_TEMPLATES.party` in `src/lib/defaults.js`.
2. Update the same figures in `src/lib/calc.test.mjs`.
3. Run `npm test`. The assertions are written with tolerances, so they should still
   pass — if they don't, the real numbers disagree with the assumed ticket mix and
   that itself is worth knowing.

---

## Where the data lives

Everything stays in the browser it was entered in. There is no database, no account,
and nothing is sent anywhere except the numbers included in a debrief request, and
only when that button is pressed.

**Save to file** downloads a `.json` copy. **Open** loads one back. That is how a plan
moves between devices or gets handed to someone else.

---

## Notes for handoff

If this engagement ever ends, everything needed to keep running it is in this repo:

- The code, with the math isolated in one tested file
- This document
- The only external dependency is an optional AI API key, which can be swapped for
  any provider by editing `api/debrief.js`

The app works with no key at all. The AI debrief is the only feature that needs one,
and the copy-prompt fallback covers it.
