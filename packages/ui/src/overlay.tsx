'use client';
/**
 * Dialog + BottomSheet, both built on the native <dialog> element.
 *
 * showModal() gives us the focus trap, Esc-to-close, inert background and the
 * top-layer stacking for free — every one of which the two hand-rolled overlays
 * this replaces got wrong. We only add: backdrop-click, body scroll lock, and
 * the sheet-vs-centred presentation.
 */
import * as React from 'react';
import { cn } from './cn';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Rendered as the heading and wired to aria-labelledby. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned footer (actions). Carries the safe-area inset. */
  footer?: React.ReactNode;
  className?: string;
  /** Hide the ✕ — use for flows that must be resolved, not dismissed. */
  hideClose?: boolean;
  /** Esc / backdrop cannot dismiss. */
  dismissible?: boolean;
}

function useDialog(open: boolean, onClose: () => void, dismissible: boolean) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault(); // let React own `open`, not the DOM
    if (dismissible) onClose();
  };

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (dismissible && e.target === ref.current) onClose();
  };

  return { ref, onCancel, onBackdropClick };
}

function Shell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  hideClose,
  dismissible = true,
  sheet,
}: OverlayProps & { sheet: boolean }) {
  const { ref, onCancel, onBackdropClick } = useDialog(open, onClose, dismissible);
  const titleId = React.useId();

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClick={onBackdropClick}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-fade-in',
        // reset UA styles
        'm-0 max-h-none max-w-none border-0 bg-transparent p-0 text-charcoal',
        sheet
          ? 'fixed inset-x-0 bottom-0 top-auto w-full lg:inset-0 lg:m-auto lg:h-fit lg:w-[28rem]'
          : 'fixed inset-0 m-auto h-fit w-[min(28rem,calc(100vw-2rem))]',
      )}
    >
      <div
        className={cn(
          'flex max-h-[85dvh] flex-col overflow-hidden bg-white shadow-hero',
          sheet
            ? 'rounded-t-2xl animate-sheet-up lg:rounded-2xl lg:animate-fade-in'
            : 'rounded-2xl animate-fade-in',
          className,
        )}
      >
        {sheet && (
          <div className="flex justify-center pt-2.5 lg:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-hairline" />
          </div>
        )}
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="font-display text-lg font-bold text-ink">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="tap -mr-2 -mt-2 grid shrink-0 place-items-center rounded-xl text-muted transition duration-fast hover:bg-hairline/40 hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="safe-pb border-t border-hairline bg-white px-5 pt-3 lg:pb-3">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

/** Centred modal. Confirmations and short decisions only. */
export function Dialog(props: OverlayProps) {
  return <Shell {...props} sheet={false} />;
}

/** Bottom sheet under `lg`, centred dialog at `lg`+. Pickers, filters, breakdowns. */
export function BottomSheet(props: OverlayProps) {
  return <Shell {...props} sheet />;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Defaults to "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get the danger button. */
  destructive?: boolean;
}

/**
 * Promise-based confirmation, so `window.confirm` can go.
 *
 * Native confirm is unstyleable, blocks the whole tab, and reads the raw origin
 * to the user — for "delete your account permanently" that is the worst possible
 * presentation of the most serious action in the app.
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ title: 'Delete your account?' }))) return;
 *   …
 *   return (<>{confirmDialog}…</>);
 */
export function useConfirm() {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const resolve = React.useRef<((ok: boolean) => void) | null>(null);

  const settle = React.useCallback((ok: boolean) => {
    resolve.current?.(ok);
    resolve.current = null;
    setOpts(null);
  }, []);

  const confirm = React.useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((res) => {
        resolve.current = res;
        setOpts(o);
      }),
    [],
  );

  const element = (
    <Dialog
      open={opts !== null}
      onClose={() => settle(false)}
      title={opts?.title}
      description={opts?.description}
      footer={
        <div className="flex gap-2">
          <ButtonLike onClick={() => settle(false)} variant="outline">
            {opts?.cancelLabel ?? 'Cancel'}
          </ButtonLike>
          <ButtonLike
            onClick={() => settle(true)}
            variant={opts?.destructive ? 'danger' : 'primary'}
          >
            {opts?.confirmLabel ?? 'Confirm'}
          </ButtonLike>
        </div>
      }
    >
      {null}
    </Dialog>
  );

  return [confirm, element] as const;
}

// Local button so overlay.tsx does not import primitives.tsx (which imports cn
// from here-adjacent modules); same visual vocabulary, no cycle.
function ButtonLike({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: 'outline' | 'primary' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'tap flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-fast',
        variant === 'outline' && 'border border-hairline bg-white text-ink hover:bg-bg',
        variant === 'primary' && 'bg-accent text-white hover:brightness-95',
        variant === 'danger' && 'bg-danger text-bg hover:brightness-110',
      )}
    >
      {children}
    </button>
  );
}
