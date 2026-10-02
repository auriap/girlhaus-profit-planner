/**
 * Builds the debrief prompt.
 *
 * This is shared by the serverless function and the copy-to-clipboard
 * fallback, so the wording of the analysis is identical either way.
 *
 * Important: every number in the prompt is already computed by calc.js.
 * The model is told explicitly not to do arithmetic. It writes the
 * narrative; the engine owns the math.
 */

const money = (n) =>
  n === undefined || n === null || !Number.isFinite(n)
    ? '—'
    : `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;

export function buildFacts(plan, result, be, comparison) {
  const lines = [];

  lines.push(`EVENT: ${plan.name || 'Untitled event'}`);
  if (plan.date) lines.push(`DATE: ${plan.date}`);
  lines.push(`TYPE: ${plan.eventType || 'event'}`);
  lines.push('');

  lines.push('TICKET TIERS');
  (result.tiers || []).forEach((t) => {
    lines.push(
      `- ${t.label}: ${money(t.price)} each, ${t.sold} of ${t.available} sold, ${money(t.revenue)} collected`
    );
  });
  lines.push('');

  lines.push('REVENUE');
  lines.push(`- Ticket revenue: ${money(result.grossTicketRevenue)}`);
  if (result.otherRevenueTotal) lines.push(`- Sponsorship and other flat revenue: ${money(result.otherRevenueTotal)}`);
  if (result.perGuestRevenueTotal) lines.push(`- Per-guest revenue (bar, merch): ${money(result.perGuestRevenueTotal)}`);
  lines.push(`- Total revenue: ${money(result.totalRevenue)}`);
  lines.push('');

  lines.push('COSTS');
  (plan.fixedCosts || []).forEach((c) => {
    if (c.label || c.amount) lines.push(`- ${c.label || 'Unlabeled'}: ${money(Number(c.amount) || 0)}`);
  });
  if (result.perGuestCostTotal) lines.push(`- Per-guest costs total: ${money(result.perGuestCostTotal)}`);
  if (result.platformFees) lines.push(`- Platform and processing fees: ${money(result.platformFees)}`);
  lines.push(`- Total costs: ${money(result.totalCosts)}`);
  lines.push('');

  lines.push('BOTTOM LINE');
  lines.push(`- Guests: ${result.guests}`);
  lines.push(`- Profit: ${money(result.profit)}`);
  lines.push(`- Margin: ${result.margin}%`);
  lines.push(`- Revenue per guest: ${money(result.revenuePerGuest)}`);
  lines.push(`- Cost per guest: ${money(result.costPerGuest)}`);
  lines.push('');

  lines.push('BREAK-EVEN');
  if (be.reason === 'negative-contribution') {
    lines.push('- Each guest costs more than they bring in. No attendance level makes this profitable.');
  } else if (be.reason === 'covered') {
    lines.push('- Fixed costs are already covered by committed revenue before any tickets sell.');
  } else {
    lines.push(`- Guests needed to break even: ${be.guestsNeeded}`);
    lines.push(`- That is ${be.pctOfCapacity}% of total capacity (${be.totalAvailable} tickets)`);
    lines.push(`- Each guest contributes ${money(be.contribution)} after fees and per-guest costs`);
    lines.push(`- Break-even achievable within capacity: ${be.achievable ? 'yes' : 'no'}`);
  }

  if (comparison) {
    lines.push('');
    lines.push('PLANNED VS ACTUAL');
    lines.push(`- Guests: planned ${comparison.projected.guests}, actual ${comparison.actual.guests} (${comparison.variance.guests >= 0 ? '+' : ''}${comparison.variance.guests})`);
    lines.push(`- Revenue: planned ${money(comparison.projected.totalRevenue)}, actual ${money(comparison.actual.totalRevenue)} (${comparison.variance.totalRevenue >= 0 ? '+' : ''}${money(comparison.variance.totalRevenue)})`);
    lines.push(`- Costs: planned ${money(comparison.projected.totalCosts)}, actual ${money(comparison.actual.totalCosts)} (${comparison.variance.totalCosts >= 0 ? '+' : ''}${money(comparison.variance.totalCosts)})`);
    lines.push(`- Profit: planned ${money(comparison.projected.profit)}, actual ${money(comparison.actual.profit)} (${comparison.variance.profit >= 0 ? '+' : ''}${money(comparison.variance.profit)})`);

    const overruns = (comparison.lineVariances || []).filter((l) => l.variance !== 0);
    if (overruns.length) {
      lines.push('- Cost lines that moved:');
      overruns.forEach((l) => {
        lines.push(
          `  - ${l.label}${l.unplanned ? ' (was not in the plan)' : ''}: planned ${money(l.planned)}, actual ${money(l.actual)}, ${l.variance >= 0 ? 'over' : 'under'} by ${money(Math.abs(l.variance))}`
        );
      });
    }
  }

  if (plan.notes) {
    lines.push('');
    lines.push(`ORGANIZER NOTES: ${plan.notes}`);
  }

  return lines.join('\n');
}

export const SYSTEM_INSTRUCTION = `You are writing an event debrief for the owner of GirlHaus, a women's social club that runs parties, dinners, classes and wellness events.

Rules you must follow:
- Every number you need has already been calculated and is given to you. Do NOT perform any arithmetic, do not recompute totals, and do not introduce any figure that is not in the data provided.
- Write for a business owner, not an analyst. No jargon, no "leverage", no "synergies".
- Be direct about bad news. If the event lost money, say so plainly in the first sentence.
- Every recommendation must point at a specific number from the data.
- Do not invent context about the event that you were not told.

Structure your response with these four sections, using these exact headings:

## What happened
Two or three sentences. The result in plain language.

## Why
The two or three specific numbers that drove the outcome. Name the cost lines or the attendance gap responsible.

## What to change next time
Three concrete actions, each tied to a number. Be specific: a price, a headcount, a cost line to renegotiate.

## What to watch
One or two things to track going into the next event.

Keep the whole response under 400 words.`;

export function buildPrompt(plan, result, be, comparison) {
  return `Here is the data for one event. Write the debrief.\n\n${buildFacts(
    plan,
    result,
    be,
    comparison
  )}`;
}

/**
 * The clipboard version, for pasting into ChatGPT or Claude directly.
 * Bundles the instruction and the data into one block.
 */
export function buildPastablePrompt(plan, result, be, comparison) {
  return `${SYSTEM_INSTRUCTION}\n\n---\n\n${buildPrompt(plan, result, be, comparison)}`;
}
