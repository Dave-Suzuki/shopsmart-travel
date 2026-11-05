import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  tone?: 'default' | 'danger';
}

interface ActionMenuProps {
  /** Accessible name of the trigger button, e.g. "More actions". */
  label: string;
  /** Id of an element that says what the menu acts on (e.g. the item's name). */
  describedBy?: string;
  items: ActionMenuItem[];
}

const ITEM_HEIGHT = 44; // min-h-11
const MENU_CHROME = 8 + 2 + 4; // py-1, border, gap to the trigger

/**
 * A 44px "⋮" button that opens a small menu of actions. The menu opens under the button, or
 * above it when there isn't room below, and is right-aligned so it stays on screen at the end of
 * a row. Esc closes it and returns focus to the button; arrow keys move between items.
 */
export function ActionMenu({ label, describedBy, items }: ActionMenuProps) {
  // null while closed
  const [placement, setPlacement] = useState<'below' | 'above' | null>(null);
  const open = placement !== null;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const openMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = items.length * ITEM_HEIGHT + MENU_CHROME;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const roomBelow = viewportHeight - rect.bottom;
    setPlacement(roomBelow < menuHeight && rect.top > roomBelow ? 'above' : 'below');
  };

  const close = (returnFocus: boolean) => {
    setPlacement(null);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setPlacement(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = menuItems.findIndex((item) => item === document.activeElement);
    const focusAt = (i: number) => menuItems[(i + menuItems.length) % menuItems.length]?.focus();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(menuItems.length - 1);
        break;
      case 'Tab':
        // Continue the tab order from the button (the focused item is about to disappear).
        close(true);
        break;
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={describedBy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openMenu())}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={`absolute right-0 z-30 w-52 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
            placement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                // Close the menu now (not after a confirm() the action may show) and focus the
                // trigger first, so a dialog opened by the action returns focus there.
                flushSync(() => setPlacement(null));
                triggerRef.current?.focus();
                item.onSelect();
              }}
              className={`flex min-h-11 w-full items-center gap-3 px-4 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                item.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-800 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
