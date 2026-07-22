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
  return <div className={cn('card', className)} {...p} />;
}

// --- Badge -------------------------------------------------------------
const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
  {
    variants: {
      tone: {
        accent: 'bg-accent/15 text-[color:rgb(var(--accent))]',
        success: 'bg-success/15 text-[color:rgb(var(--success))]',
        danger: 'bg-danger/15 text-[color:rgb(var(--danger))]',
        muted: 'bg-hairline/60 text-muted',
        ink: 'bg-ink text-bg',
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
