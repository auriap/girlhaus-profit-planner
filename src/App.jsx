import { useEffect, useMemo, useRef, useState } from 'react';
import {
  breakEven,
  project,
  scenarioTable,
  profitCurve,
  compareActuals,
  insights,
} from './lib/calc.js';
import { newPlan, emptyActuals, EVENT_TEMPLATES, COST_SUGGESTIONS, OTHER_REVENUE_SUGGESTIONS } from './lib/defaults.js';
import { save, load, exportFile, importFile } from './lib/storage.js';
import { Card, Field, TextInput, NumberInput, Button, money, Note } from './components/ui.jsx';
import { TierRows, AmountRows } from './components/EditableRows.jsx';
import Results from './components/Results.jsx';
import { ActualsInput, ActualsVariance } from './components/Actuals.jsx';
import Debrief from './components/Debrief.jsx';

const TABS = [
  { id: 'plan', label: 'Plan' },
  { id: 'compare', label: 'Compare' },
  { id: 'actuals', label: 'After the event' },
];

function initialState() {
  const stored = load();
  if (stored && Array.isArray(stored.scenarios) && stored.scenarios.length) return stored;
  return {
    scenarios: [newPlan('party', 'RnB Masquerade')],
    actuals: [emptyActuals()],
    active: 0,
    sellThrough: 0.6,
    projectedRate: 0.6,
    tab: 'plan',
  };
}

export default function App() {
  const [state, setState] = useState(initialState);
  const fileRef = useRef(null);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    save(state);
  }, [state]);

  const plan = state.scenarios[state.active];
  const actuals = state.actuals[state.active] || emptyActuals();

  const patchPlan = (patch) =>
    setState((s) => ({
      ...s,
      scenarios: s.scenarios.map((p, i) => (i === s.active ? { ...p, ...patch } : p)),
    }));

  const patchActuals = (next) =>
    setState((s) => ({
      ...s,
      actuals: s.actuals.map((a, i) => (i === s.active ? next : a)),
    }));

  const be = useMemo(() => breakEven(plan), [plan]);
  const live = useMemo(() => project(plan, state.sellThrough), [plan, state.sellThrough]);
  const table = useMemo(() => scenarioTable(plan), [plan]);
  const curve = useMemo(() => profitCurve(plan), [plan]);
  const notes = useMemo(() => insights(plan), [plan]);
  const comparison = useMemo(
    () => compareActuals(plan, actuals, state.projectedRate),
    [plan, actuals, state.projectedRate]
  );

  const actualGuests = comparison.actual.guests;
  const hasActuals = actualGuests > 0;

  const addScenario = () => {
    setState((s) => ({
      ...s,
      scenarios: [
        ...s.scenarios,
        { ...structuredClone(s.scenarios[s.active]), name: `${s.scenarios[s.active].name || 'Event'} (option ${s.scenarios.length + 1})` },
      ],
      actuals: [...s.actuals, emptyActuals()],
      active: s.scenarios.length,
      tab: 'plan',
    }));
  };

  const removeScenario = (index) => {
    setState((s) => {
      if (s.scenarios.length <= 1) return s;
      const scenarios = s.scenarios.filter((_, i) => i !== index);
      const acts = s.actuals.filter((_, i) => i !== index);
      return {
        ...s,
        scenarios,
        actuals: acts,
        active: Math.max(0, Math.min(s.active, scenarios.length - 1)),
      };
    });
  };

  const applyTemplate = (key) => {
    const fresh = newPlan(key, plan.name);
    patchPlan({ ...fresh, name: plan.name, date: plan.date, venueCapacity: plan.venueCapacity });
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const loaded = await importFile(file);
      setState({
        scenarios: loaded.scenarios,
        actuals: loaded.actuals || loaded.scenarios.map(() => emptyActuals()),
        active: 0,
        sellThrough: loaded.sellThrough ?? 0.6,
        projectedRate: loaded.projectedRate ?? 0.6,
        tab: 'plan',
      });
    } catch (err) {
      setImportError(err.message);
    }
    e.target.value = '';
  };

  const comparisons = state.scenarios.map((p) => ({
    name: p.name || 'Untitled',
    be: breakEven(p),
    full: project(p, 1),
    mid: project(p, 0.6),
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-1.5 rounded-full bg-haus-pink" />
              <h1 className="text-lg font-medium text-ink">Event Profit Planner</h1>
            </div>
            <p className="mt-0.5 pl-3.5 text-sm text-ink-soft">
              GirlHaus · built by Atelier Consulting Solutions
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Open
            </Button>
            <Button variant="secondary" onClick={() => exportFile(state)}>
              Save to file
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {importError && (
          <div className="mb-4">
            <Note level="warning">{importError}</Note>
          </div>
        )}

        <div className="no-print mb-5 flex flex-wrap items-center gap-2">
          {state.scenarios.map((p, i) => (
            <div key={i} className="flex items-center">
              <button
                onClick={() => setState((s) => ({ ...s, active: i }))}
                className={`rounded-l-lg border px-3 py-1.5 text-sm transition ${
                  i === state.active
                    ? 'border-haus-pink bg-haus-pink text-white'
                    : 'border-line bg-white text-ink-soft hover:border-haus-pink hover:text-haus-pink-dark'
                } ${state.scenarios.length > 1 ? '' : 'rounded-r-lg'}`}
              >
                {p.name || `Option ${i + 1}`}
              </button>
              {state.scenarios.length > 1 && (
                <button
                  onClick={() => removeScenario(i)}
                  aria-label={`Remove ${p.name || `option ${i + 1}`}`}
                  className={`rounded-r-lg border border-l-0 px-2 py-1.5 text-sm transition ${
                    i === state.active
                      ? 'border-haus-pink bg-haus-pink text-white/70 hover:text-white'
                      : 'border-line bg-white text-ink-faint hover:text-haus-red'
                  }`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <Button variant="secondary" onClick={addScenario}>
            + Compare another version
          </Button>
        </div>

        <div className="no-print mb-5 flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setState((s) => ({ ...s, tab: t.id }))}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                state.tab === t.id
                  ? 'border-haus-pink text-haus-pink-dark'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {state.tab === 'plan' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="min-w-0 space-y-5">
              <Card title="The event">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Event name" className="sm:col-span-2">
                    <TextInput
                      value={plan.name}
                      placeholder="e.g. RnB Masquerade"
                      onChange={(e) => patchPlan({ name: e.target.value })}
                    />
                  </Field>
                  <Field label="Date">
                    <TextInput
                      type="date"
                      value={plan.date}
                      onChange={(e) => patchPlan({ date: e.target.value })}
                    />
                  </Field>
                  <Field label="Venue capacity" hint="Optional — a sanity check on ticket counts">
                    <NumberInput
                      value={plan.venueCapacity}
                      onChange={(e) => patchPlan({ venueCapacity: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <span className="mb-1.5 block text-xs font-medium tracking-wide text-ink-soft uppercase">
                    Start from a template
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(EVENT_TEMPLATES).map(([key, t]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyTemplate(key)}
                        title={t.hint}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          plan.eventType === key
                            ? 'border-haus-pink bg-haus-pink-light text-haus-pink-dark'
                            : 'border-line bg-white text-ink-soft hover:border-haus-pink hover:text-haus-pink-dark'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Templates only prefill the lines below — everything stays editable.
                  </p>
                </div>
              </Card>

              <Card title="What people pay" subtitle="Ticket tiers, class seats, or table prices.">
                <TierRows tiers={plan.tiers} onChange={(tiers) => patchPlan({ tiers })} />
              </Card>

              <Card title="Costs that don't change with turnout" subtitle="You pay these whether 10 people come or 200.">
                <AmountRows
                  rows={plan.fixedCosts}
                  onChange={(fixedCosts) => patchPlan({ fixedCosts })}
                  addLabel="Add cost"
                  placeholder="e.g. Venue"
                  suggestions={COST_SUGGESTIONS}
                  idPrefix="c"
                  emptyText="No costs yet."
                />
              </Card>

              <Card title="Costs per person" subtitle="Food, drinks, favors — anything that scales with headcount.">
                <AmountRows
                  rows={plan.perGuestCosts}
                  onChange={(perGuestCosts) => patchPlan({ perGuestCosts })}
                  addLabel="Add per-person cost"
                  placeholder="e.g. Food per head"
                  perGuest
                  idPrefix="p"
                  emptyText="None — costs don't scale with attendance."
                />
              </Card>

              <Card title="Money in besides tickets">
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-ink">Flat amounts</h3>
                    <AmountRows
                      rows={plan.otherRevenue}
                      onChange={(otherRevenue) => patchPlan({ otherRevenue })}
                      addLabel="Add revenue"
                      placeholder="e.g. Brand sponsorship"
                      suggestions={OTHER_REVENUE_SUGGESTIONS}
                      idPrefix="o"
                      emptyText="None."
                    />
                  </div>
                  <div className="border-t border-line pt-4">
                    <h3 className="mb-2 text-sm font-medium text-ink">Per person</h3>
                    <AmountRows
                      rows={plan.perGuestRevenue}
                      onChange={(perGuestRevenue) => patchPlan({ perGuestRevenue })}
                      addLabel="Add per-person revenue"
                      placeholder="e.g. Bar cut per head"
                      perGuest
                      idPrefix="g"
                      emptyText="None."
                    />
                  </div>
                </div>
              </Card>

              <Card title="Ticketing fees" subtitle="What Posh or your payment processor takes.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Percentage of ticket sales">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={plan.platformFeePct}
                        onChange={(e) => patchPlan({ platformFeePct: e.target.value })}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 pr-8 text-sm text-ink focus:border-haus-pink focus:ring-2 focus:ring-haus-pink/20 focus:outline-none"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-faint">
                        %
                      </span>
                    </div>
                  </Field>
                  <Field label="Flat fee per ticket">
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-faint">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.platformFeeFlat}
                        onChange={(e) => patchPlan({ platformFeeFlat: e.target.value })}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 pl-7 text-sm text-ink focus:border-haus-pink focus:ring-2 focus:ring-haus-pink/20 focus:outline-none"
                      />
                    </div>
                  </Field>
                </div>
              </Card>

              <Card title="Notes" subtitle="Context for the debrief — anything unusual about this event.">
                <textarea
                  value={plan.notes || ''}
                  onChange={(e) => patchPlan({ notes: e.target.value })}
                  rows={3}
                  placeholder="e.g. first event at this venue, competing homecoming party same night"
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-haus-pink focus:ring-2 focus:ring-haus-pink/20 focus:outline-none"
                />
              </Card>
            </div>

            <div className="min-w-0 space-y-5 lg:sticky lg:top-6 lg:self-start">
              <Results
                plan={plan}
                be={be}
                table={table}
                curve={curve}
                notes={notes}
                sellThrough={state.sellThrough}
                onSellThrough={(sellThrough) => setState((s) => ({ ...s, sellThrough }))}
                live={live}
                actualGuests={hasActuals ? actualGuests : undefined}
              />
              <Debrief
                plan={plan}
                result={hasActuals ? comparison.actual : live}
                be={be}
                comparison={hasActuals ? comparison : null}
              />
            </div>
          </div>
        )}

        {state.tab === 'compare' && (
          <Card
            title="Side by side"
            subtitle="Every version of this event you've built, against the same yardsticks."
          >
            {state.scenarios.length < 2 ? (
              <Note level="info">
                Add a second version above to compare. Duplicate this one, change the prices or the
                venue, and see which plan holds up.
              </Note>
            ) : (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs tracking-wide text-ink-soft uppercase">
                      <th className="px-1 pb-2 font-medium">Version</th>
                      <th className="px-1 pb-2 text-right font-medium">Break-even</th>
                      <th className="px-1 pb-2 text-right font-medium">% of house</th>
                      <th className="px-1 pb-2 text-right font-medium">Per guest</th>
                      <th className="px-1 pb-2 text-right font-medium">Profit at 60%</th>
                      <th className="px-1 pb-2 text-right font-medium">Full house</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {comparisons.map((c, i) => (
                      <tr
                        key={i}
                        className={`border-b border-line/60 last:border-0 ${
                          i === state.active ? 'bg-haus-pink-light/40' : ''
                        }`}
                      >
                        <td className="px-1 py-2.5 font-medium text-ink">{c.name}</td>
                        <td className="px-1 py-2.5 text-right text-ink-soft">
                          {Number.isFinite(c.be.guestsNeeded) ? c.be.guestsNeeded : 'never'}
                        </td>
                        <td
                          className={`px-1 py-2.5 text-right ${
                            !c.be.achievable ? 'font-medium text-haus-red' : 'text-ink-soft'
                          }`}
                        >
                          {Number.isFinite(c.be.pctOfCapacity) ? `${c.be.pctOfCapacity}%` : '—'}
                        </td>
                        <td className="px-1 py-2.5 text-right text-ink-soft">
                          {money(c.be.contribution, { cents: true })}
                        </td>
                        <td
                          className={`px-1 py-2.5 text-right font-medium ${
                            c.mid.profit > 0 ? 'text-emerald-700' : 'text-haus-red'
                          }`}
                        >
                          {money(c.mid.profit)}
                        </td>
                        <td
                          className={`px-1 py-2.5 text-right ${
                            c.full.profit > 0 ? 'text-emerald-700' : 'text-haus-red'
                          }`}
                        >
                          {money(c.full.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {state.tab === 'actuals' && (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <ActualsInput
              plan={plan}
              actuals={actuals}
              onChange={patchActuals}
              projectedRate={state.projectedRate}
              onProjectedRate={(projectedRate) => setState((s) => ({ ...s, projectedRate }))}
            />
            <div className="min-w-0 space-y-5 lg:sticky lg:top-6 lg:self-start">
              <ActualsVariance comparison={comparison} />
              <Debrief
                plan={plan}
                result={comparison.actual}
                be={be}
                comparison={comparison}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-faint sm:px-6">
          Saved in this browser automatically. Use “Save to file” to keep a copy or move it to
          another device. Atelier Consulting Solutions · Strategy. Technology. Built for you.
        </div>
      </footer>
    </div>
  );
}
