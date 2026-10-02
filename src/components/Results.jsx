/**
 * The answer panel. Break-even, the projection table, and the
 * plain-language observations.
 */

import { Card, Stat, Note, money } from './ui.jsx';
import BreakEvenChart from './BreakEvenChart.jsx';

export default function Results({ plan, be, table, curve, notes, sellThrough, onSellThrough, live, actualGuests }) {
  const beDisplay = !Number.isFinite(be.guestsNeeded)
    ? '—'
    : be.reason === 'covered'
      ? '0'
      : be.guestsNeeded.toString();

  const beTone = be.reason === 'ok' || be.reason === 'covered' ? 'accent' : 'bad';

  return (
    <div className="space-y-5">
      <Card
        title="The answer"
        subtitle="Recalculated as you type. Nothing here is estimated — it is arithmetic on the numbers above."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Break-even guests"
            value={beDisplay}
            tone={beTone}
            hint={
              Number.isFinite(be.pctOfCapacity)
                ? `${be.pctOfCapacity}% of capacity`
                : 'Not reachable at these prices'
            }
          />
          <Stat
            label="Each guest adds"
            value={money(be.contribution, { cents: true })}
            tone={be.contribution > 0 ? 'good' : 'bad'}
            hint="After fees and per-guest costs"
          />
          <Stat
            label={`Profit at ${Math.round(sellThrough * 100)}% sold`}
            value={money(live.profit)}
            tone={live.profit > 0 ? 'good' : live.profit < 0 ? 'bad' : 'plain'}
            hint={`${live.guests} guests`}
          />
          <Stat
            label="Margin"
            value={live.totalRevenue > 0 ? `${live.margin}%` : '—'}
            tone={live.margin > 0 ? 'good' : live.margin < 0 ? 'bad' : 'plain'}
            hint={`${money(live.totalRevenue)} in, ${money(live.totalCosts)} out`}
          />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="sell-through" className="text-xs font-medium tracking-wide text-ink-soft uppercase">
              How much of the house sells
            </label>
            <span className="text-sm font-medium text-ink tabular-nums">
              {Math.round(sellThrough * 100)}%
            </span>
          </div>
          <input
            id="sell-through"
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(sellThrough * 100)}
            onChange={(e) => onSellThrough(parseInt(e.target.value, 10) / 100)}
            className="w-full accent-haus-pink"
          />
        </div>

        {notes.length > 0 && (
          <div className="mt-5 space-y-2">
            {notes.map((n, i) => (
              <Note key={i} level={n.level}>
                {n.text}
              </Note>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Where the lines cross"
        subtitle="Below the crossing point the event loses money. Above it, it makes money."
      >
        <BreakEvenChart
          curve={curve}
          breakEvenGuests={be.guestsNeeded}
          actualGuests={actualGuests}
        />
      </Card>

      <Card title="If sales land at…" subtitle="The same plan at four different turnouts.">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-ink-soft uppercase">
                <th className="px-1 pb-2 font-medium">Turnout</th>
                <th className="px-1 pb-2 text-right font-medium">Guests</th>
                <th className="px-1 pb-2 text-right font-medium">Revenue</th>
                <th className="px-1 pb-2 text-right font-medium">Costs</th>
                <th className="px-1 pb-2 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {table.map((row) => (
                <tr key={row.rate} className="border-b border-line/60 last:border-0">
                  <td className="px-1 py-2.5 text-ink">{row.label}</td>
                  <td className="px-1 py-2.5 text-right text-ink-soft">{row.guests}</td>
                  <td className="px-1 py-2.5 text-right text-ink-soft">{money(row.totalRevenue)}</td>
                  <td className="px-1 py-2.5 text-right text-ink-soft">{money(row.totalCosts)}</td>
                  <td
                    className={`px-1 py-2.5 text-right font-medium ${
                      row.profit > 0 ? 'text-emerald-700' : row.profit < 0 ? 'text-haus-red' : 'text-ink'
                    }`}
                  >
                    {money(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
