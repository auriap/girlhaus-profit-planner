/**
 * Event Profit Planner — calculation engine
 *
 * All arithmetic in this file is deterministic. No AI, no estimation.
 * The AI layer only writes narrative around numbers produced here.
 *
 * Money is handled in whole cents internally to avoid floating point drift,
 * then converted back to dollars at the boundary.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * An event plan.
 *
 * tiers:        [{ id, label, price, available }]   ticket tiers or class seats
 * fixedCosts:   [{ id, label, amount }]             costs that don't change with headcount
 * perGuestCosts:[{ id, label, amount }]             costs incurred per person who attends
 * otherRevenue: [{ id, label, amount }]             sponsorships, vendor fees — flat
 * perGuestRevenue: [{ id, label, amount }]          bar cut, merch average — per person
 * platformFeePct:   number  percentage of gross ticket sales taken by the platform
 * platformFeeFlat:  number  flat fee charged per ticket sold
 */

/**
 * Project a plan at a given sell-through rate (0 to 1).
 * Tier mix is held proportional to availability.
 */
export function project(plan, sellThrough) {
  const rate = Math.max(0, Math.min(1, num(sellThrough)));

  const tierResults = (plan.tiers || []).map((t) => {
    const available = Math.max(0, Math.floor(num(t.available)));
    const sold = Math.floor(available * rate);
    const price = num(t.price);
    return {
      id: t.id,
      label: t.label,
      price,
      available,
      sold,
      revenue: round2(price * sold),
    };
  });

  return computeFromSold(plan, tierResults);
}

/**
 * Compute a full result set from explicit per-tier sold counts.
 * Used both for projections and for post-event actuals.
 */
export function computeFromSold(plan, tierResults) {
  const guests = tierResults.reduce((s, t) => s + t.sold, 0);
  const grossTicketRevenue = round2(
    tierResults.reduce((s, t) => s + t.price * t.sold, 0)
  );

  const otherRevenueTotal = round2(
    (plan.otherRevenue || []).reduce((s, r) => s + num(r.amount), 0)
  );
  const perGuestRevenueRate = round2(
    (plan.perGuestRevenue || []).reduce((s, r) => s + num(r.amount), 0)
  );
  const perGuestRevenueTotal = round2(perGuestRevenueRate * guests);

  const totalRevenue = round2(
    grossTicketRevenue + otherRevenueTotal + perGuestRevenueTotal
  );

  const platformFees = round2(
    grossTicketRevenue * (num(plan.platformFeePct) / 100) +
      num(plan.platformFeeFlat) * guests
  );

  const fixedCostTotal = round2(
    (plan.fixedCosts || []).reduce((s, c) => s + num(c.amount), 0)
  );
  const perGuestCostRate = round2(
    (plan.perGuestCosts || []).reduce((s, c) => s + num(c.amount), 0)
  );
  const perGuestCostTotal = round2(perGuestCostRate * guests);

  const totalCosts = round2(fixedCostTotal + perGuestCostTotal + platformFees);
  const profit = round2(totalRevenue - totalCosts);
  const margin = totalRevenue > 0 ? round2((profit / totalRevenue) * 100) : 0;

  return {
    tiers: tierResults,
    guests,
    grossTicketRevenue,
    otherRevenueTotal,
    perGuestRevenueTotal,
    totalRevenue,
    fixedCostTotal,
    perGuestCostTotal,
    platformFees,
    totalCosts,
    profit,
    margin,
    revenuePerGuest: guests > 0 ? round2(totalRevenue / guests) : 0,
    costPerGuest: guests > 0 ? round2(totalCosts / guests) : 0,
  };
}

/**
 * Blended contribution margin per guest, using the availability-weighted
 * average ticket price. This is what each additional person through the door
 * actually adds to the bottom line.
 */
export function contributionPerGuest(plan) {
  const tiers = plan.tiers || [];
  const totalAvailable = tiers.reduce(
    (s, t) => s + Math.max(0, Math.floor(num(t.available))),
    0
  );

  const blendedPrice =
    totalAvailable > 0
      ? round2(
          tiers.reduce(
            (s, t) => s + num(t.price) * Math.max(0, Math.floor(num(t.available))),
            0
          ) / totalAvailable
        )
      : 0;

  const perGuestRevenueRate = (plan.perGuestRevenue || []).reduce(
    (s, r) => s + num(r.amount),
    0
  );
  const perGuestCostRate = (plan.perGuestCosts || []).reduce(
    (s, c) => s + num(c.amount),
    0
  );

  const feeOnTicket = blendedPrice * (num(plan.platformFeePct) / 100);
  const contribution = round2(
    blendedPrice -
      feeOnTicket -
      num(plan.platformFeeFlat) +
      perGuestRevenueRate -
      perGuestCostRate
  );

  return { blendedPrice, contribution, totalAvailable };
}

/**
 * Break-even analysis.
 *
 * Fixed costs, less any flat revenue already committed (sponsorships),
 * divided by what each guest contributes.
 */
export function breakEven(plan) {
  const { blendedPrice, contribution, totalAvailable } = contributionPerGuest(plan);

  const fixedCostTotal = round2(
    (plan.fixedCosts || []).reduce((s, c) => s + num(c.amount), 0)
  );
  const otherRevenueTotal = round2(
    (plan.otherRevenue || []).reduce((s, r) => s + num(r.amount), 0)
  );
  const netFixed = round2(fixedCostTotal - otherRevenueTotal);

  // Already profitable with zero guests
  if (netFixed <= 0) {
    return {
      guestsNeeded: 0,
      revenueNeeded: 0,
      pctOfCapacity: 0,
      achievable: true,
      contribution,
      blendedPrice,
      totalAvailable,
      reason: 'covered',
    };
  }

  // Each guest loses money — no headcount fixes this
  if (contribution <= 0) {
    return {
      guestsNeeded: Infinity,
      revenueNeeded: Infinity,
      pctOfCapacity: Infinity,
      achievable: false,
      contribution,
      blendedPrice,
      totalAvailable,
      reason: 'negative-contribution',
    };
  }

  const guestsNeeded = Math.ceil(netFixed / contribution);
  const pctOfCapacity =
    totalAvailable > 0 ? round2((guestsNeeded / totalAvailable) * 100) : Infinity;

  return {
    guestsNeeded,
    revenueNeeded: round2(guestsNeeded * blendedPrice),
    pctOfCapacity,
    achievable: totalAvailable > 0 && guestsNeeded <= totalAvailable,
    contribution,
    blendedPrice,
    totalAvailable,
    reason: totalAvailable > 0 && guestsNeeded <= totalAvailable ? 'ok' : 'over-capacity',
  };
}

/**
 * A curve of profit against guest count, for the break-even chart.
 */
export function profitCurve(plan, steps = 24) {
  const { totalAvailable } = contributionPerGuest(plan);
  if (totalAvailable <= 0) return [];

  const points = [];
  const stride = Math.max(1, Math.round(totalAvailable / steps));

  for (let g = 0; g <= totalAvailable; g += stride) {
    const rate = totalAvailable > 0 ? g / totalAvailable : 0;
    const r = project(plan, rate);
    points.push({ guests: r.guests, profit: r.profit, revenue: r.totalRevenue, costs: r.totalCosts });
  }

  const last = project(plan, 1);
  if (points.length === 0 || points[points.length - 1].guests !== last.guests) {
    points.push({
      guests: last.guests,
      profit: last.profit,
      revenue: last.totalRevenue,
      costs: last.totalCosts,
    });
  }

  return points;
}

export const DEFAULT_SCENARIOS = [0.4, 0.6, 0.8, 1.0];

/**
 * Projections across the standard sell-through scenarios.
 */
export function scenarioTable(plan, rates = DEFAULT_SCENARIOS) {
  return rates.map((rate) => ({
    rate,
    label: `${Math.round(rate * 100)}% sold`,
    ...project(plan, rate),
  }));
}

/**
 * Compare projected results against what actually happened.
 *
 * actuals: {
 *   tiersSold:  { [tierId]: number },
 *   costOverrides: { [costId]: number },   actual amount for a planned cost line
 *   extraCosts: [{ id, label, amount }],   costs that weren't planned at all
 *   otherRevenueOverrides: { [revenueId]: number }
 * }
 */
export function compareActuals(plan, actuals, projectedRate = 0.6) {
  const projected = project(plan, projectedRate);

  const actualPlan = {
    ...plan,
    fixedCosts: [
      ...(plan.fixedCosts || []).map((c) => ({
        ...c,
        amount:
          actuals.costOverrides && actuals.costOverrides[c.id] !== undefined
            ? num(actuals.costOverrides[c.id])
            : num(c.amount),
      })),
      ...(actuals.extraCosts || []),
    ],
    otherRevenue: (plan.otherRevenue || []).map((r) => ({
      ...r,
      amount:
        actuals.otherRevenueOverrides && actuals.otherRevenueOverrides[r.id] !== undefined
          ? num(actuals.otherRevenueOverrides[r.id])
          : num(r.amount),
    })),
  };

  const actualTierResults = (plan.tiers || []).map((t) => {
    const sold = Math.max(
      0,
      Math.floor(num(actuals.tiersSold ? actuals.tiersSold[t.id] : 0))
    );
    const price = num(t.price);
    return {
      id: t.id,
      label: t.label,
      price,
      available: Math.max(0, Math.floor(num(t.available))),
      sold,
      revenue: round2(price * sold),
    };
  });

  const actual = computeFromSold(actualPlan, actualTierResults);

  const variance = {
    guests: actual.guests - projected.guests,
    totalRevenue: round2(actual.totalRevenue - projected.totalRevenue),
    totalCosts: round2(actual.totalCosts - projected.totalCosts),
    profit: round2(actual.profit - projected.profit),
    margin: round2(actual.margin - projected.margin),
  };

  const lineVariances = [
    ...(plan.fixedCosts || []).map((c) => {
      const planned = num(c.amount);
      const real =
        actuals.costOverrides && actuals.costOverrides[c.id] !== undefined
          ? num(actuals.costOverrides[c.id])
          : planned;
      return {
        id: c.id,
        label: c.label,
        planned,
        actual: real,
        variance: round2(real - planned),
        unplanned: false,
      };
    }),
    ...(actuals.extraCosts || []).map((c) => ({
      id: c.id,
      label: c.label,
      planned: 0,
      actual: num(c.amount),
      variance: round2(num(c.amount)),
      unplanned: true,
    })),
  ];

  return { projected, actual, variance, lineVariances };
}

/**
 * Plain-language observations derived entirely from the computed numbers.
 * These are facts about the arithmetic, not predictions.
 */
export function insights(plan) {
  const be = breakEven(plan);
  const full = project(plan, 1);
  const out = [];

  if (be.reason === 'negative-contribution') {
    out.push({
      level: 'danger',
      text: `Every guest costs more than they bring in. At these prices this event loses money at any attendance. Raise prices or cut per-guest costs before anything else.`,
    });
  } else if (!be.achievable && be.reason === 'over-capacity') {
    out.push({
      level: 'danger',
      text: `Break-even needs ${be.guestsNeeded} guests but only ${be.totalAvailable} tickets exist. This event cannot break even as planned.`,
    });
  } else if (be.pctOfCapacity > 80) {
    out.push({
      level: 'warning',
      text: `Break-even sits at ${be.pctOfCapacity}% of capacity. That leaves almost no margin for a slow sales week.`,
    });
  } else if (be.pctOfCapacity > 0) {
    out.push({
      level: 'ok',
      text: `Break-even at ${be.guestsNeeded} guests, which is ${be.pctOfCapacity}% of capacity.`,
    });
  }

  if (be.contribution > 0) {
    out.push({
      level: 'info',
      text: `Each additional guest adds $${be.contribution.toFixed(2)} to the bottom line after fees and per-guest costs.`,
    });
  }

  if (full.fixedCostTotal > 0 && full.totalRevenue > 0) {
    const fixedShare = round2((full.fixedCostTotal / full.totalRevenue) * 100);
    if (fixedShare > 60) {
      out.push({
        level: 'warning',
        text: `Fixed costs are ${fixedShare}% of revenue at a full house. Costs that don't move with attendance are the biggest risk in this plan.`,
      });
    }
  }

  const biggest = [...(plan.fixedCosts || [])].sort(
    (a, b) => num(b.amount) - num(a.amount)
  )[0];
  if (biggest && num(biggest.amount) > 0 && full.fixedCostTotal > 0) {
    const share = round2((num(biggest.amount) / full.fixedCostTotal) * 100);
    if (share > 35) {
      out.push({
        level: 'info',
        text: `${biggest.label} alone is ${share}% of fixed costs. Negotiating that one line moves the break-even point more than anything else.`,
      });
    }
  }

  return out;
}
