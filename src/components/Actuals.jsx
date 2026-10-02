/**
 * After the event: what really happened, and how far off the plan was.
 *
 * This is the half that makes the tool something you come back to.
 * Planned figures are shown beside the inputs so nothing has to be
 * remembered or looked up elsewhere.
 */

import { Card, Stat, MoneyInput, NumberInput, TextInput, Button, IconButton, PlusIcon, TrashIcon, money, signed } from './ui.jsx';
import { uid } from '../lib/defaults.js';

function VarianceStat({ label, planned, actual, value, invert = false, format = money }) {
  const good = invert ? value < 0 : value > 0;
  const tone = value === 0 ? 'plain' : good ? 'good' : 'bad';
  return (
    <Stat
      label={label}
      value={format(actual)}
      tone={tone}
      hint={`planned ${format(planned)} · ${value === 0 ? 'on plan' : (value > 0 ? '+' : '') + format(value)}`}
    />
  );
}

export function ActualsInput({ plan, actuals, onChange, projectedRate, onProjectedRate }) {
  const setSold = (tierId, v) =>
    onChange({ ...actuals, tiersSold: { ...actuals.tiersSold, [tierId]: v } });

  const setCostOverride = (costId, v) =>
    onChange({ ...actuals, costOverrides: { ...actuals.costOverrides, [costId]: v } });

  const setOtherOverride = (revId, v) =>
    onChange({
      ...actuals,
      otherRevenueOverrides: { ...actuals.otherRevenueOverrides, [revId]: v },
    });

  const addExtra = () =>
    onChange({
      ...actuals,
      extraCosts: [...(actuals.extraCosts || []), { id: uid('x'), label: '', amount: 0 }],
    });

  const updateExtra = (id, patch) =>
    onChange({
      ...actuals,
      extraCosts: actuals.extraCosts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  const removeExtra = (id) =>
    onChange({ ...actuals, extraCosts: actuals.extraCosts.filter((c) => c.id !== id) });

  const totalSold = (plan.tiers || []).reduce(
    (s, t) => s + (parseInt(actuals.tiersSold?.[t.id], 10) || 0),
    0
  );

  return (
    <div className="space-y-5">
      <Card
        title="What actually happened"
        subtitle="Fill this in after the event. Anything left blank is treated as going exactly to plan."
        tone="pink"
      >
        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="planned-rate" className="text-xs font-medium tracking-wide text-ink-soft uppercase">
              Compare against which forecast
            </label>
            <span className="text-sm font-medium text-ink tabular-nums">
              {Math.round(projectedRate * 100)}% sold
            </span>
          </div>
          <input
            id="planned-rate"
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(projectedRate * 100)}
            onChange={(e) => onProjectedRate(parseInt(e.target.value, 10) / 100)}
            className="w-full accent-haus-pink"
          />
          <p className="mt-1 text-xs text-ink-faint">
            Set this to the turnout you were expecting when you planned the event.
          </p>
        </div>

        <h3 className="mb-2 text-sm font-medium text-ink">Tickets actually sold</h3>
        <div className="space-y-2">
          {(plan.tiers || []).map((t) => (
            <div key={t.id} className="grid grid-cols-[1fr_6rem] items-center gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm text-ink">{t.label || 'Unnamed tier'}</div>
                <div className="text-xs text-ink-faint tabular-nums">
                  {money(parseFloat(t.price) || 0)} each · {t.available} available
                </div>
              </div>
              <NumberInput
                value={actuals.tiersSold?.[t.id] ?? ''}
                placeholder="0"
                max={t.available}
                onChange={(e) => setSold(t.id, e.target.value)}
                aria-label={`${t.label} actually sold`}
              />
            </div>
          ))}
        </div>
        {(plan.tiers || []).length > 0 && (
          <p className="mt-2 text-sm text-ink-soft tabular-nums">{totalSold} total through the door</p>
        )}

        {(plan.fixedCosts || []).length > 0 && (
          <>
            <h3 className="mt-6 mb-1 text-sm font-medium text-ink">What the costs really came to</h3>
            <p className="mb-2 text-xs text-ink-faint">Only fill in the lines that came out different.</p>
            <div className="space-y-2">
              {plan.fixedCosts.map((c) => (
                <div key={c.id} className="grid grid-cols-[1fr_7rem] items-center gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink">{c.label || 'Unnamed cost'}</div>
                    <div className="text-xs text-ink-faint tabular-nums">
                      planned {money(parseFloat(c.amount) || 0)}
                    </div>
                  </div>
                  <MoneyInput
                    value={actuals.costOverrides?.[c.id] ?? ''}
                    placeholder={String(parseFloat(c.amount) || 0)}
                    onChange={(e) => setCostOverride(c.id, e.target.value)}
                    aria-label={`${c.label} actual amount`}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {(plan.otherRevenue || []).length > 0 && (
          <>
            <h3 className="mt-6 mb-2 text-sm font-medium text-ink">Sponsorship and other revenue</h3>
            <div className="space-y-2">
              {plan.otherRevenue.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_7rem] items-center gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink">{r.label || 'Unnamed'}</div>
                    <div className="text-xs text-ink-faint tabular-nums">
                      planned {money(parseFloat(r.amount) || 0)}
                    </div>
                  </div>
                  <MoneyInput
                    value={actuals.otherRevenueOverrides?.[r.id] ?? ''}
                    placeholder={String(parseFloat(r.amount) || 0)}
                    onChange={(e) => setOtherOverride(r.id, e.target.value)}
                    aria-label={`${r.label} actual amount`}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className="mt-6 mb-1 text-sm font-medium text-ink">Costs that weren't in the plan</h3>
        <p className="mb-2 text-xs text-ink-faint">
          The surprises. These are usually where the money went.
        </p>
        <div className="space-y-2">
          {(actuals.extraCosts || []).map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_7rem_2.25rem] gap-2">
              <TextInput
                value={c.label}
                placeholder="e.g. bar minimum shortfall"
                onChange={(e) => updateExtra(c.id, { label: e.target.value })}
                aria-label="Unplanned cost name"
              />
              <MoneyInput
                value={c.amount}
                onChange={(e) => updateExtra(c.id, { amount: e.target.value })}
                aria-label="Unplanned cost amount"
              />
              <IconButton label="Remove unplanned cost" onClick={() => removeExtra(c.id)}>
                <TrashIcon />
              </IconButton>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Button variant="secondary" onClick={addExtra}>
            <PlusIcon /> Add unplanned cost
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ActualsVariance({ comparison }) {
  const overruns = (comparison.lineVariances || []).filter((l) => l.variance !== 0);

  return (
    <div className="space-y-5">
      <Card title="Plan against reality" subtitle="Green means better than planned.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <VarianceStat
            label="Guests"
            planned={comparison.projected.guests}
            actual={comparison.actual.guests}
            value={comparison.variance.guests}
            format={(n) => String(n)}
          />
          <VarianceStat
            label="Revenue"
            planned={comparison.projected.totalRevenue}
            actual={comparison.actual.totalRevenue}
            value={comparison.variance.totalRevenue}
          />
          <VarianceStat
            label="Costs"
            planned={comparison.projected.totalCosts}
            actual={comparison.actual.totalCosts}
            value={comparison.variance.totalCosts}
            invert
          />
          <VarianceStat
            label="Profit"
            planned={comparison.projected.profit}
            actual={comparison.actual.profit}
            value={comparison.variance.profit}
          />
        </div>

        {overruns.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-medium text-ink">Cost lines that moved</h3>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-ink-soft uppercase">
                    <th className="px-1 pb-2 font-medium">Line</th>
                    <th className="px-1 pb-2 text-right font-medium">Planned</th>
                    <th className="px-1 pb-2 text-right font-medium">Actual</th>
                    <th className="px-1 pb-2 text-right font-medium">Difference</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {overruns
                    .slice()
                    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
                    .map((l) => (
                      <tr key={l.id} className="border-b border-line/60 last:border-0">
                        <td className="px-1 py-2.5 text-ink">
                          {l.label || 'Unnamed'}
                          {l.unplanned && (
                            <span className="ml-2 rounded-full bg-haus-red-light px-2 py-0.5 text-xs text-haus-red-dark">
                              unplanned
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-2.5 text-right text-ink-soft">{money(l.planned)}</td>
                        <td className="px-1 py-2.5 text-right text-ink-soft">{money(l.actual)}</td>
                        <td
                          className={`px-1 py-2.5 text-right font-medium ${
                            l.variance > 0 ? 'text-haus-red' : 'text-emerald-700'
                          }`}
                        >
                          {signed(l.variance)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
