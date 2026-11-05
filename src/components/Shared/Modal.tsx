import { useEffect, useEffectEvent, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-4xl',
} as const;

// Open dialogs, innermost last. Only the innermost one handles Esc, Tab and stray focus.
const openDialogs: HTMLElement[] = [];

let scrollLocks = 0;
let restoreScroll: (() => void) | null = null;

function lockScroll() {
  scrollLocks += 1;
  if (scrollLocks > 1) return;
  const { body, documentElement: html } = document;
  const previous = { html: html.style.overflow, body: body.style.overflow, padding: body.style.paddingRight };
  // Keep the page from shifting when its scrollbar disappears (desktop).
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  restoreScroll = () => {
    html.style.overflow = previous.html;
    body.style.overflow = previous.body;
    body.style.paddingRight = previous.padding;
  };
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    restoreScroll?.();
    restoreScroll = null;
  }
}

function focusableIn(container: HTMLElement): HTMLElement[] {
  // Skip anything not rendered (display: none, e.g. a hidden file input or `hidden sm:inline`).
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0
  );
}

export interface ModalProps {
  /** Shown in the header; also the dialog's accessible name. */
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling body, e.g. a form's buttons (use `form="…"` on a submit button). */
  footer?: ReactNode;
  /** Optional icon shown before the title. */
  icon?: ReactNode;
  /** Maximum width from 640px up. Below that the dialog is a full-width bottom sheet. */
  size?: keyof typeof SIZES;
  /** Element to focus when the dialog opens. Defaults to the dialog itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Classes for the scrolling body; replaces the default padding. */
  bodyClassName?: string;
}

/**
 * An accessible modal dialog. Rendering it opens it; unmounting it closes it.
 *
 * - Below 640px it's a bottom sheet; from 640px a centred dialog.
 * - The header (title and Close) stays put while the body scrolls.
 * - Esc and a click on the backdrop call `onClose`.
 * - Tab stays inside the dialog. Focus moves in when it opens and returns to the opener after.
 * - The page behind doesn't scroll while it's open.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  icon,
  size = 'md',
  initialFocusRef,
  bodyClassName = 'p-4 sm:p-6',
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const requestClose = useEffectEvent(() => onClose());
  const getInitialFocus = useEffectEvent(() => initialFocusRef?.current ?? null);

  // Runs once per opening: everything it needs from props is read through effect events.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogs.push(panel);
    lockScroll();
    (getInitialFocus() ?? panel).focus({ preventScroll: true });

    const isInnermost = () => openDialogs[openDialogs.length - 1] === panel;

    const handleKeyDown = (event: KeyboardEvent) => {
      // A control inside the dialog may have handled the key already (e.g. Enter in a field).
      if (!isInnermost() || event.defaultPrevented) return;

      if (event.key === 'Escape') {
        // Esc during IME composition (e.g. Japanese input) only cancels the composition.
        if (event.isComposing) return;
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = focusableIn(panel);
      const active = document.activeElement;
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outside = !active || !panel.contains(active);
      if (event.shiftKey && (outside || active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Pull focus back if it lands behind the dialog (e.g. tabbing in from the browser's toolbar).
    // Toasts sit above the dialog and stay usable.
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isInnermost() || !(target instanceof Element) || panel.contains(target)) return;
      if (target.closest('[data-sonner-toaster]')) return;
      panel.focus({ preventScroll: true });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      const index = openDialogs.indexOf(panel);
      if (index !== -1) openDialogs.splice(index, 1);
      unlockScroll();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop: a sibling of the panel, so a drag that ends outside the panel doesn't close it */}
      <div className="absolute inset-0 bg-black/50 motion-safe:animate-backdrop-in" aria-hidden="true" onClick={() => onClose()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-panel relative flex w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl outline-none max-sm:pb-[env(safe-area-inset-bottom)] sm:rounded-xl ${SIZES[size]} motion-safe:animate-sheet-in sm:motion-safe:animate-dialog-in`}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 py-1.5 pl-4 pr-1.5 sm:pl-6 sm:pr-3">
          {icon}
          <h2 id={titleId} className="min-w-0 flex-1 break-words text-lg font-bold text-gray-900 sm:text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-gray-200 px-4 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
