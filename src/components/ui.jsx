/**
 * Small shared pieces. Kept in one file so the component tree stays shallow.
 */

export const money = (n, opts = {}) => {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
  return `${n < 0 ? '-' : ''}$${formatted}`;
};

export const signed = (n) => (n > 0 ? `+${money(n)}` : money(n));

export function Card({ title, subtitle, children, right, tone = 'plain' }) {
  const tones = {
    plain: 'bg-white border-line',
    pink: 'bg-haus-pink-light border-haus-pink/25',
    red: 'bg-haus-red-light border-haus-red/25',
  };
  return (
    <section className={`rounded-2xl border ${tones[tone]} p-5 sm:p-6`}>
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-medium text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-haus-pink focus:ring-2 focus:ring-haus-pink/20 focus:outline-none';

export function TextInput({ className = '', ...props }) {
  return <input type="text" className={`${inputBase} ${className}`} {...props} />;
}

export function MoneyInput({ className = '', value, onChange, ...props }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-faint">
        $
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={value}
        onChange={onChange}
        className={`${inputBase} pl-7 ${className}`}
        {...props}
      />
    </div>
  );
}

export function NumberInput({ className = '', ...props }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      step="1"
      className={`${inputBase} ${className}`}
      {...props}
    />
  );
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const variants = {
    primary:
      'bg-haus-pink text-white hover:bg-haus-pink-dark focus:ring-haus-pink/30 disabled:bg-haus-pink/40',
    secondary:
      'bg-white text-ink border border-line hover:border-haus-pink hover:text-haus-pink-dark focus:ring-haus-pink/20',
    ghost: 'bg-transparent text-ink-soft hover:text-haus-red hover:bg-haus-red-light focus:ring-haus-red/20',
    danger: 'bg-haus-red text-white hover:bg-haus-red-dark focus:ring-haus-red/30',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition focus:ring-2 focus:outline-none disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-haus-red-light hover:text-haus-red focus:ring-2 focus:ring-haus-red/20 focus:outline-none"
    >
      {children}
    </button>
  );
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Stat({ label, value, tone = 'plain', hint }) {
  const tones = {
    plain: 'text-ink',
    good: 'text-emerald-700',
    bad: 'text-haus-red',
    accent: 'text-haus-pink-dark',
  };
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-xs font-medium tracking-wide text-ink-soft uppercase">{label}</div>
      <div className={`mt-1.5 text-xl font-medium tabular-nums sm:text-2xl ${tones[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export function Note({ level = 'info', children }) {
  const styles = {
    danger: 'bg-haus-red-light border-haus-red/30 text-haus-red-dark',
    warning: 'bg-amber-50 border-amber-300/60 text-amber-900',
    ok: 'bg-emerald-50 border-emerald-300/50 text-emerald-900',
    info: 'bg-haus-pink-light border-haus-pink/25 text-haus-pink-dark',
  };
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles[level]}`}>{children}</div>
  );
}
