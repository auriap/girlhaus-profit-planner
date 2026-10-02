/**
 * Starting templates.
 *
 * Every line below is editable in the app — nothing here is hardcoded into
 * the logic. These exist so someone opening the tool isn't staring at a
 * blank form. Replace the placeholder amounts with GirlHaus's real figures
 * once they're available.
 */

let counter = 0;
export const uid = (prefix = 'r') => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export const EVENT_TEMPLATES = {
  party: {
    label: 'Party or social',
    hint: 'Masquerade, RnB night, mixer, gala',
    plan: {
      eventType: 'party',
      tiers: [
        { id: uid('t'), label: 'Early bird', price: 25, available: 60 },
        { id: uid('t'), label: 'General admission', price: 35, available: 140 },
        { id: uid('t'), label: 'VIP', price: 60, available: 40 },
      ],
      fixedCosts: [
        { id: uid('c'), label: 'Venue', amount: 1800 },
        { id: uid('c'), label: 'Entertainment (DJ, host)', amount: 900 },
        { id: uid('c'), label: 'Decor', amount: 750 },
        { id: uid('c'), label: 'Security', amount: 600 },
        { id: uid('c'), label: 'Photographer / videographer', amount: 500 },
        { id: uid('c'), label: 'Marketing and promo', amount: 450 },
      ],
      perGuestCosts: [],
      otherRevenue: [],
      perGuestRevenue: [],
      platformFeePct: 5,
      platformFeeFlat: 0,
    },
  },

  class: {
    label: 'Class or workshop',
    hint: 'Heels class, workout class, wellness session',
    plan: {
      eventType: 'class',
      tiers: [{ id: uid('t'), label: 'Seat', price: 25, available: 20 }],
      fixedCosts: [
        { id: uid('c'), label: 'Studio or space rental', amount: 150 },
        { id: uid('c'), label: 'Instructor', amount: 100 },
        { id: uid('c'), label: 'Promo', amount: 50 },
      ],
      perGuestCosts: [{ id: uid('c'), label: 'Water / supplies per person', amount: 3 }],
      otherRevenue: [],
      perGuestRevenue: [],
      platformFeePct: 5,
      platformFeeFlat: 0,
    },
  },

  dinner: {
    label: 'Dinner or seated experience',
    hint: 'Dinner party, brunch, curated seated event',
    plan: {
      eventType: 'dinner',
      tiers: [{ id: uid('t'), label: 'Seat', price: 75, available: 30 }],
      fixedCosts: [
        { id: uid('c'), label: 'Venue', amount: 500 },
        { id: uid('c'), label: 'Decor and tablescape', amount: 300 },
        { id: uid('c'), label: 'Photographer', amount: 250 },
      ],
      perGuestCosts: [{ id: uid('c'), label: 'Food per head', amount: 28 }],
      otherRevenue: [],
      perGuestRevenue: [],
      platformFeePct: 5,
      platformFeeFlat: 0,
    },
  },

  blank: {
    label: 'Start from scratch',
    hint: 'Build it line by line',
    plan: {
      eventType: 'blank',
      tiers: [{ id: uid('t'), label: 'Ticket', price: 0, available: 0 }],
      fixedCosts: [{ id: uid('c'), label: '', amount: 0 }],
      perGuestCosts: [],
      otherRevenue: [],
      perGuestRevenue: [],
      platformFeePct: 5,
      platformFeeFlat: 0,
    },
  },
};

export const COST_SUGGESTIONS = [
  'Venue',
  'Entertainment (DJ, host)',
  'Decor',
  'Security',
  'Photographer / videographer',
  'Marketing and promo',
  'Printing',
  'Bar minimum',
  'Insurance',
  'Staffing',
  'Transport',
  'Permits',
];

export const OTHER_REVENUE_SUGGESTIONS = [
  'Brand sponsorship',
  'Vendor table fee',
  'Bar revenue share',
  'Merch sales',
  'Raffle',
];

export function newPlan(templateKey = 'party', name = '') {
  const t = EVENT_TEMPLATES[templateKey] || EVENT_TEMPLATES.party;
  return {
    name: name || '',
    date: '',
    venueCapacity: 0,
    notes: '',
    ...structuredClone(t.plan),
    // Fresh IDs so two scenarios from one template don't collide
    tiers: t.plan.tiers.map((x) => ({ ...x, id: uid('t') })),
    fixedCosts: t.plan.fixedCosts.map((x) => ({ ...x, id: uid('c') })),
    perGuestCosts: t.plan.perGuestCosts.map((x) => ({ ...x, id: uid('p') })),
    otherRevenue: t.plan.otherRevenue.map((x) => ({ ...x, id: uid('o') })),
    perGuestRevenue: t.plan.perGuestRevenue.map((x) => ({ ...x, id: uid('g') })),
  };
}

export const emptyActuals = () => ({
  tiersSold: {},
  costOverrides: {},
  extraCosts: [],
  otherRevenueOverrides: {},
  recorded: false,
  notes: '',
});
