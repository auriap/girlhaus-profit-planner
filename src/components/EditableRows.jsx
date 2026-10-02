/**
 * Generic add/remove row editors.
 *
 * Nothing about the categories is hardcoded — every list in the planner
 * is built from these, so a user can rename, add, or delete any line.
 */

import { Button, IconButton, MoneyInput, NumberInput, TextInput, PlusIcon, TrashIcon, money } from './ui.jsx';
import { uid } from '../lib/defaults.js';

export function TierRows({ tiers, onChange }) {
  const update = (id, patch) =>
    onChange(tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id) => onChange(tiers.filter((t) => t.id !== id));
  const add = () =>
    onChange([...tiers, { id: uid('t'), label: '', price: 0, available: 0 }]);

  const totalCapacity = tiers.reduce(
    (s, t) => s + (parseInt(t.available, 10) || 0),
    0
  );
  const maxRevenue = tiers.reduce(
    (s, t) => s + (parseFloat(t.price) || 0) * (parseInt(t.available, 10) || 0),
    0
  );

  return (
    <div>
      <div className="hidden gap-2 pb-2 text-xs font-medium tracking-wide text-ink-soft uppercase sm:grid sm:grid-cols-[1fr_7rem_6rem_2.25rem]">
        <div>Tier name</div>
        <div>Price</div>
        <div>Available</div>
        <div />
      </div>

      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_7rem_6rem_2.25rem]">
            <TextInput
              className="col-span-2 sm:col-span-1"
              value={t.label}
              placeholder="e.g. General admission"
              onChange={(e) => update(t.id, { label: e.target.value })}
              aria-label="Tier name"
            />
            <MoneyInput
              value={t.price}
              onChange={(e) => update(t.id, { price: e.target.value })}
              aria-label="Ticket price"
            />
            <div className="flex items-center gap-1">
              <NumberInput
                value={t.available}
                onChange={(e) => update(t.id, { available: e.target.value })}
                aria-label="Tickets available"
              />
              <IconButton label={`Remove ${t.label || 'tier'}`} onClick={() => remove(t.id)}>
                <TrashIcon />
              </IconButton>
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <p className="py-3 text-sm text-ink-faint">
          No tiers yet. Add one to start.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={add}>
          <PlusIcon /> Add tier
        </Button>
        <p className="text-sm text-ink-soft tabular-nums">
          {totalCapacity} tickets · {money(maxRevenue)} at a full house
        </p>
      </div>
    </div>
  );
}

export function AmountRows({
  rows,
  onChange,
  addLabel,
  placeholder,
  suggestions = [],
  perGuest = false,
  emptyText,
  idPrefix = 'r',
}) {
  const update = (id, patch) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => onChange(rows.filter((r) => r.id !== id));
  const add = (label = '') =>
    onChange([...rows, { id: uid(idPrefix), label, amount: 0 }]);

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const used = new Set(rows.map((r) => r.label));
  const unused = suggestions.filter((s) => !used.has(s));

  return (
    <div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_7rem_2.25rem] gap-2">
            <TextInput
              value={r.label}
              placeholder={placeholder}
              onChange={(e) => update(r.id, { label: e.target.value })}
              aria-label="Line item name"
            />
            <MoneyInput
              value={r.amount}
              onChange={(e) => update(r.id, { amount: e.target.value })}
              aria-label="Amount"
            />
            <IconButton label={`Remove ${r.label || 'line'}`} onClick={() => remove(r.id)}>
              <TrashIcon />
            </IconButton>
          </div>
        ))}
      </div>

      {rows.length === 0 && emptyText && (
        <p className="py-3 text-sm text-ink-faint">{emptyText}</p>
      )}

      {unused.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {unused.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft transition hover:border-haus-pink hover:text-haus-pink-dark"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => add()}>
          <PlusIcon /> {addLabel}
        </Button>
        <p className="text-sm text-ink-soft tabular-nums">
          {money(total, { cents: perGuest })} {perGuest ? 'per guest' : 'total'}
        </p>
      </div>
    </div>
  );
}
