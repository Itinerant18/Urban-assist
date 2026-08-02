import type { LucideIcon } from 'lucide-react';
import { cn } from '@urban-assist/ui';

/** Responsive bento board grid — 2 / 6 / 12 cols */
export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-3 lg:gap-4 auto-rows-[minmax(120px,auto)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

type BentoTileProps = {
  children: React.ReactNode;
  className?: string;
  /** Elevated hero shadow instead of card shadow */
  hero?: boolean;
  /** Soft terracotta tint — use at most once per board */
  accent?: boolean;
  /** Disable hover lift (e.g. form tiles) */
  static?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function BentoTile({
  children,
  className,
  hero = false,
  accent = false,
  static: isStatic = false,
  ...rest
}: BentoTileProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-hairline p-5 flex flex-col justify-between',
        accent ? 'bg-accent/8' : 'bg-white',
        hero ? 'shadow-hero' : 'shadow-card',
        !isStatic && 'transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transform-none',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** signed delta text tone */
  deltaTone?: 'success' | 'danger' | 'muted';
  icon?: LucideIcon;
  className?: string;
  accent?: boolean;
  hero?: boolean;
};

export function StatTile({
  label,
  value,
  sub,
  deltaTone = 'muted',
  icon: Icon,
  className,
  accent = false,
  hero = false,
}: StatTileProps) {
  const subTone =
    deltaTone === 'success'
      ? 'text-success'
      : deltaTone === 'danger'
        ? 'text-danger'
        : 'text-muted';

  return (
    <BentoTile accent={accent} hero={hero} className={cn('gap-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden /> : null}
      </div>
      <div>
        <p
          className={cn(
            'text-2xl lg:text-3xl font-bold font-mono tracking-tight',
            accent ? 'text-accent' : 'text-ink',
          )}
        >
          {value}
        </p>
        {sub != null && sub !== '' ? (
          <p className={cn('text-[11px] mt-1', subTone)}>{sub}</p>
        ) : null}
      </div>
    </BentoTile>
  );
}

export type StatusTone = 'success' | 'pending' | 'danger' | 'accent';

const statusToneClass: Record<StatusTone, string> = {
  success: 'bg-success/12 text-success',
  pending: 'bg-hairline text-muted',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-accent/10 text-accent',
};

export function StatusChip({
  children,
  tone = 'pending',
  mono = false,
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        statusToneClass[tone],
        mono && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Single grouped table surface with divide-y rows */
export function TableTile({
  children,
  className,
  header,
}: {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-hairline bg-white shadow-card overflow-hidden',
        className,
      )}
    >
      {header ? (
        <div className="border-b border-hairline px-5 py-3">{header}</div>
      ) : null}
      <div className="overflow-x-auto">
        <div className="divide-y divide-hairline min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** Standard list/table row inside a TableTile */
export function TableRow({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const classes = cn(
    'flex items-center gap-3 px-5 py-3 hover:bg-bg/60 transition-colors min-h-[44px]',
    className,
  );

  if (href) {
    // Link is passed by caller for Next.js Link — this is a plain anchor fallback shell
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return <div className={classes}>{children}</div>;
}

/** Page title block */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle ? <p className="text-sm text-muted mt-1">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Section label inside a board */
export function SectionHeader({
  title,
  trailing,
  divider = false,
  className,
}: {
  title: string;
  trailing?: React.ReactNode;
  divider?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-3 flex items-baseline justify-between gap-2',
        divider && 'border-b border-hairline pb-2',
        className,
      )}
    >
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {trailing ? <div className="text-xs text-muted">{trailing}</div> : null}
    </div>
  );
}

/** Empty state centered in a tile — icon + one line */
export function BentoEmpty({
  icon: Icon,
  message,
  action,
  className,
}: {
  icon?: LucideIcon;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-10 text-center',
        className,
      )}
    >
      {Icon ? <Icon className="h-8 w-8 text-muted" aria-hidden /> : null}
      <p className="text-sm text-muted">{message}</p>
      {action}
    </div>
  );
}

/** Map common admin status strings to chip tones */
export function statusToneFrom(status: string | null | undefined): StatusTone {
  const s = (status ?? '').toLowerCase();
  if (
    ['approved', 'active', 'completed', 'paid', 'verified', 'resolved', 'success'].some((k) =>
      s.includes(k),
    )
  ) {
    return 'success';
  }
  if (
    ['failed', 'rejected', 'cancelled', 'canceled', 'urgent', 'dispute', 'banned', 'error'].some(
      (k) => s.includes(k),
    )
  ) {
    return 'danger';
  }
  if (['pending', 'open', 'review', 'draft', 'assigned', 'in_progress', 'processing'].some((k) => s.includes(k))) {
    return 'pending';
  }
  return 'pending';
}
