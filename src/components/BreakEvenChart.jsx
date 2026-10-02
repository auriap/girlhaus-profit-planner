/**
 * Revenue against costs as attendance rises. Where the lines cross is
 * break-even — the most legible way to show a non-technical owner why
 * an event does or doesn't work.
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { money } from './ui.jsx';

const REVENUE = '#e8457f';
const COSTS = '#2563eb';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-ink">{label} guests</div>
      <div className="space-y-0.5 tabular-nums">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: REVENUE }} />
          <span className="text-ink-soft">Revenue</span>
          <span className="ml-auto text-ink">{money(point.revenue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: COSTS }} />
          <span className="text-ink-soft">Costs</span>
          <span className="ml-auto text-ink">{money(point.costs)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 border-t border-line pt-1">
          <span className="text-ink-soft">Profit</span>
          <span
            className={`ml-auto font-medium ${point.profit < 0 ? 'text-haus-red' : 'text-emerald-700'}`}
          >
            {money(point.profit)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BreakEvenChart({ curve, breakEvenGuests, actualGuests }) {
  if (!curve || curve.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint">
        Add ticket tiers with prices and quantities to see the chart.
      </p>
    );
  }

  const beValid =
    Number.isFinite(breakEvenGuests) &&
    breakEvenGuests > 0 &&
    breakEvenGuests <= curve[curve.length - 1].guests;

  const bePoint = beValid
    ? curve.reduce((best, p) =>
        Math.abs(p.guests - breakEvenGuests) < Math.abs(best.guests - breakEvenGuests) ? p : best
      )
    : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: REVENUE }} />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: COSTS }} />
          Costs
        </span>
        {beValid && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full ring-2 ring-white" style={{ background: '#1a1418' }} />
            Break-even at {breakEvenGuests} guests
          </span>
        )}
      </div>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="#ecdfe5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="guests"
              tick={{ fontSize: 11, fill: '#8d848b' }}
              stroke="#ecdfe5"
              label={{
                value: 'Guests through the door',
                position: 'insideBottom',
                offset: -2,
                style: { fontSize: 11, fill: '#8d848b' },
              }}
              height={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#8d848b' }}
              stroke="#ecdfe5"
              tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={REVENUE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="costs"
              stroke={COSTS}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              name="Costs"
            />
            {bePoint && (
              <ReferenceDot
                x={bePoint.guests}
                y={bePoint.revenue}
                r={5}
                fill="#1a1418"
                stroke="#fff"
                strokeWidth={2}
                isFront
              />
            )}
            {Number.isFinite(actualGuests) && actualGuests > 0 && (
              <ReferenceLine
                x={curve.reduce((best, p) =>
                  Math.abs(p.guests - actualGuests) < Math.abs(best.guests - actualGuests) ? p : best
                ).guests}
                stroke="#8d848b"
                strokeDasharray="2 3"
                label={{
                  value: `actual ${actualGuests}`,
                  position: 'top',
                  style: { fontSize: 10, fill: '#5c525a' },
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
