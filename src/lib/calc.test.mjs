/**
 * Verification for the calculation engine.
 *
 * The critical test is the masquerade case: the engine must reproduce
 * the real ~$3,000 loss from GirlHaus's first major event. If it doesn't,
 * nothing else in this tool can be trusted.
 *
 * Run with: node src/lib/calc.test.mjs
 */

import {
  project,
  breakEven,
  contributionPerGuest,
  compareActuals,
  scenarioTable,
  profitCurve,
  insights,
} from './calc.js';

let passed = 0;
let failed = 0;

function check(name, actual, expected, tolerance = 0.01) {
  const ok =
    typeof expected === 'number'
      ? Math.abs(actual - expected) <= tolerance
      : actual === expected;
  if (ok) {
    passed++;
    console.log(`  pass  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        expected ${expected}, got ${actual}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/* ------------------------------------------------------------------ *
 * The masquerade — placeholder line items against known real totals.
 * Expenses ~$5,000, revenue ~$2,000, loss ~$3,000.
 * Replace these amounts with Niara's receipts when they arrive; the
 * assertions below should still hold within a few hundred dollars.
 * ------------------------------------------------------------------ */

const masquerade = {
  name: 'RnB Masquerade',
  tiers: [
    { id: 't1', label: 'Early bird', price: 25, available: 60 },
    { id: 't2', label: 'General admission', price: 35, available: 140 },
    { id: 't3', label: 'VIP', price: 60, available: 40 },
  ],
  fixedCosts: [
    { id: 'c1', label: 'Venue', amount: 1800 },
    { id: 'c2', label: 'Entertainment (DJ, host)', amount: 900 },
    { id: 'c3', label: 'Decor and masks', amount: 750 },
    { id: 'c4', label: 'Security', amount: 600 },
    { id: 'c5', label: 'Photographer / videographer', amount: 500 },
    { id: 'c6', label: 'Marketing and promo', amount: 450 },
  ],
  perGuestCosts: [],
  otherRevenue: [],
  perGuestRevenue: [],
  platformFeePct: 5,
  platformFeeFlat: 0,
};

section('Masquerade — plan totals');

const fixedTotal = masquerade.fixedCosts.reduce((s, c) => s + c.amount, 0);
check('fixed costs total ~$5,000', fixedTotal, 5000, 100);

section('Masquerade — reproducing the real result');

// Actual outcome: roughly $2,000 of ticket revenue was taken in.
// That works out to about 60 people through the door on this tier mix.
const actualSold = { t1: 30, t2: 30, t3: 3 };
const actualResult = compareActuals(
  masquerade,
  { tiersSold: actualSold, costOverrides: {}, extraCosts: [], otherRevenueOverrides: {} },
  0.6
);

check('actual guests', actualResult.actual.guests, 63);
check('actual revenue ~$2,000', actualResult.actual.totalRevenue, 2000, 150);
check('actual loss ~$3,000', actualResult.actual.profit, -3000, 200);

section('Break-even');

const be = breakEven(masquerade);
const contrib = contributionPerGuest(masquerade);

// Blended price: (25*60 + 35*140 + 60*40) / 240 = (1500 + 4900 + 2400) / 240
check('blended ticket price', contrib.blendedPrice, 36.67, 0.02);

// Contribution: 36.67 - 5% fee = 34.84
check('contribution per guest', be.contribution, 34.84, 0.05);

// 5000 / 34.84 = 143.5 -> 144
check('guests needed to break even', be.guestsNeeded, 144);
check('break-even is achievable within capacity', be.achievable, true);
check('break-even as % of capacity', be.pctOfCapacity, 60, 0.5);

// The event sold 58 against a break-even of 144. This is the number
// that should have stopped the event in planning.
check('actual attendance fell short of break-even', actualResult.actual.guests < be.guestsNeeded, true);

section('Sell-through projections');

const table = scenarioTable(masquerade);
check('four scenarios produced', table.length, 4);
check('40% sell-through loses money', table[0].profit < 0, true);
check('100% sell-through is profitable', table[3].profit > 0, true);

// Full house: 60*25 + 140*35 + 40*60 = 1500 + 4900 + 2400 = 8800
check('full house gross revenue', table[3].grossTicketRevenue, 8800);
// Fees at 5% of 8800 = 440. Costs 5000 + 440 = 5440. Profit 8800 - 5440 = 3360
check('full house profit', table[3].profit, 3360, 1);

section('Monotonicity — profit must never fall as guests rise');

const curve = profitCurve(masquerade);
let monotonic = true;
for (let i = 1; i < curve.length; i++) {
  if (curve[i].profit < curve[i - 1].profit - 0.01) monotonic = false;
}
check('profit curve is non-decreasing', monotonic, true);
check('curve has points', curve.length > 3, true);

section('A class, not a party — per-guest costs and flat sponsorship');

const heelClass = {
  name: 'Heels class',
  tiers: [{ id: 'h1', label: 'Seat', price: 25, available: 20 }],
  fixedCosts: [
    { id: 'hc1', label: 'Studio rental', amount: 150 },
    { id: 'hc2', label: 'Instructor', amount: 100 },
  ],
  perGuestCosts: [{ id: 'hp1', label: 'Water and towel', amount: 3 }],
  otherRevenue: [{ id: 'hr1', label: 'Brand sponsorship', amount: 100 }],
  perGuestRevenue: [],
  platformFeePct: 5,
  platformFeeFlat: 0,
};

const hbe = breakEven(heelClass);
// Contribution: 25 - 1.25 fee - 3 = 20.75
check('class contribution per guest', hbe.contribution, 20.75, 0.02);
// Net fixed: 250 - 100 sponsorship = 150. 150 / 20.75 = 7.2 -> 8
check('class break-even guests', hbe.guestsNeeded, 8);

const hFull = project(heelClass, 1);
// Revenue 500 + 100 sponsor = 600. Costs 250 + 60 per-guest + 25 fees = 335
check('class full-house revenue', hFull.totalRevenue, 600);
check('class full-house costs', hFull.totalCosts, 335);
check('class full-house profit', hFull.profit, 265);

section('Per-guest revenue — bar cut');

const withBar = {
  ...masquerade,
  perGuestRevenue: [{ id: 'br1', label: 'Bar cut per head', amount: 5 }],
};
const barBe = breakEven(withBar);
check('bar cut raises contribution by $5', barBe.contribution, be.contribution + 5, 0.05);
check('bar cut lowers break-even headcount', barBe.guestsNeeded < be.guestsNeeded, true);

section('Edge cases');

const empty = {
  tiers: [],
  fixedCosts: [],
  perGuestCosts: [],
  otherRevenue: [],
  perGuestRevenue: [],
  platformFeePct: 0,
  platformFeeFlat: 0,
};
const emptyResult = project(empty, 0.5);
check('empty plan produces zero profit', emptyResult.profit, 0);
check('empty plan produces zero guests', emptyResult.guests, 0);
check('empty plan break-even is covered', breakEven(empty).reason, 'covered');

const doomed = {
  tiers: [{ id: 'd1', label: 'Ticket', price: 10, available: 100 }],
  fixedCosts: [{ id: 'dc1', label: 'Venue', amount: 500 }],
  perGuestCosts: [{ id: 'dp1', label: 'Catering per head', amount: 15 }],
  otherRevenue: [],
  perGuestRevenue: [],
  platformFeePct: 0,
  platformFeeFlat: 0,
};
const doomedBe = breakEven(doomed);
check('negative contribution is detected', doomedBe.reason, 'negative-contribution');
check('negative contribution is not achievable', doomedBe.achievable, false);

const overCapacity = {
  tiers: [{ id: 'o1', label: 'Ticket', price: 20, available: 10 }],
  fixedCosts: [{ id: 'oc1', label: 'Venue', amount: 5000 }],
  perGuestCosts: [],
  otherRevenue: [],
  perGuestRevenue: [],
  platformFeePct: 0,
  platformFeeFlat: 0,
};
check('over-capacity break-even is flagged', breakEven(overCapacity).reason, 'over-capacity');

check('garbage input does not crash', project({ tiers: [{ id: 'x', label: 'x', price: 'abc', available: null }] }, 0.5).profit, 0);

section('Variance — unplanned costs');

const withOverrun = compareActuals(
  masquerade,
  {
    tiersSold: actualSold,
    costOverrides: { c1: 2100 },
    extraCosts: [{ id: 'x1', label: 'Last-minute bar minimum', amount: 400 }],
    otherRevenueOverrides: {},
  },
  0.6
);
check('venue overrun captured', withOverrun.lineVariances.find((l) => l.id === 'c1').variance, 300);
check('unplanned cost flagged', withOverrun.lineVariances.find((l) => l.id === 'x1').unplanned, true);
check(
  'overrun deepens the loss by $700',
  withOverrun.actual.profit,
  actualResult.actual.profit - 700,
  1
);

section('Insights');

const ins = insights(masquerade);
check('insights produced', ins.length > 0, true);
check('doomed plan produces a danger insight', insights(doomed).some((i) => i.level === 'danger'), true);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
