'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonStyles = cva(
  'tap inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:brightness-95',
        secondary: 'bg-ink text-bg hover:brightness-110',
        outline: 'border border-hairline bg-white text-ink hover:bg-bg',
        ghost: 'text-ink hover:bg-hairline/40',
        danger: 'bg-danger text-bg hover:brightness-110',
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-2.5',
        lg: 'px-5 py-3 text-base',
        block: 'w-full px-5 py-3 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

// --- Input -------------------------------------------------------------
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn(
      'tap w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm placeholder:text-muted',
      'focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      className,
    )}
    {...p}
  />
));
Input.displayName = 'Input';

// --- Textarea ----------------------------------------------------------
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      className,
    )}
    {...p}
  />
));
Textarea.displayName = 'Textarea';

// --- Select ------------------------------------------------------------
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...p }, ref) => (
  <select
    ref={ref}
    className={cn(
      'tap w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink',
      'focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      className,
    )}
    {...p}
  />
));
Select.displayName = 'Select';

// --- Label / Field -----------------------------------------------------
export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('text-xs font-medium text-muted', className)}>
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// --- Card --------------------------------------------------------------
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  // Default padding + elevation so bare <Card> never renders content flush to
  // its border. cn() = tailwind-merge, so any p-*/shadow-* a caller passes wins.
  return <div className={cn('card p-5 shadow-card', className)} {...p} />;
}

// --- Badge -------------------------------------------------------------
const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
  {
    variants: {
      tone: {
        // -deep text variants: accent/success/amber pass AA only as fills or
        // large bold text, and badge text is 11px.
        accent: 'bg-accent/15 text-accent-deep',
        success: 'bg-success/15 text-success-deep',
        danger: 'bg-danger/15 text-[color:rgb(var(--danger))]',
        muted: 'bg-hairline/60 text-muted',
        ink: 'bg-ink text-bg',
        /** Amber — in-progress / on-the-way (DESIGN §8) */
        warning: 'bg-[rgb(var(--amber)/0.18)] text-amber-deep',
      },
    },
    defaultVariants: { tone: 'muted' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...p }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone }), className)} {...p} />;
}

// --- EmptyState --------------------------------------------------------
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-5 py-12 text-center border border-hairline bg-white rounded-xl shadow-card">
      {/* Floating Box Illustration */}
      <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-bg/50 border border-hairline/60">
        <svg
          className="h-12 w-12 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
        <span className="absolute bottom-1.5 h-1.5 w-12 rounded-full bg-ink/5 blur-[2px] animate-pulse" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// --- Spinner -----------------------------------------------------------
/** Inline busy indicator for buttons and short waits. Content areas get Skeleton. */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <>
      <svg
        className={cn('h-4 w-4 animate-spin', className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}

// --- ErrorState --------------------------------------------------------
/**
 * "We could not load this" — deliberately *not* EmptyState. An empty list and a
 * failed fetch are different facts and must never look the same.
 */
export function ErrorState({
  title = 'Could not load this',
  description = 'Something went wrong on our side. Your data is safe.',
  onRetry,
  retryHref,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryHref?: string;
}) {
  return (
    <div
      role="alert"
      className="card flex flex-col items-center gap-4 border border-danger/30 bg-white py-10 text-center shadow-card"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
      <div className="space-y-1">
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
      {!onRetry && retryHref && (
        <a
          href={retryHref}
          className="tap inline-flex items-center rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-bg"
        >
          Try again
        </a>
      )}
    </div>
  );
}

// --- Skeleton ----------------------------------------------------------
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-hairline/60',
        className,
      )}
      aria-hidden
    />
  );
}

/**
 * Route-level placeholder: a title plus card-shaped rows, so the page settles
 * into its real content instead of popping in from a blank screen.
 *
 * `variant` picks the row silhouette — list rows have an avatar/thumb, thread
 * rows are wider and shorter, tiles are a two-column grid.
 */
export function PageSkeleton({
  rows = 4,
  variant = 'list',
  withHeader = true,
  className,
}: {
  rows?: number;
  variant?: 'list' | 'thread' | 'tile' | 'detail';
  withHeader?: boolean;
  className?: string;
}) {
  const items = Array.from({ length: rows }, (_, i) => i);
  return (
    <div className={cn('space-y-4', className)} role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {withHeader && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}

      {variant === 'detail' ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="card space-y-3 shadow-card">
            {items.map((i) => (
              <div key={i} className="flex justify-between gap-6">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : variant === 'tile' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((i) => (
            <div key={i} className="card space-y-3 shadow-card">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i} className="card flex items-center gap-4 shadow-card">
              <Skeleton
                className={cn(
                  'shrink-0',
                  variant === 'thread' ? 'h-11 w-11 rounded-full' : 'h-12 w-12 rounded-xl',
                )}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
              {variant === 'list' && <Skeleton className="h-5 w-16 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
