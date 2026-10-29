/**
 * Platform-wide live field validation. Any input / textarea / select that carries HTML constraints
 * (required, minLength, maxLength, min, max, step, pattern, type=email|url) gets a red message under it
 * as soon as the user types something invalid or leaves the field - no per-form wiring needed.
 *
 * Skipped: controls that already show their own error (aria-invalid or an adjacent role="alert"),
 * `data-no-live-validate`, hidden/checkbox/radio/file/button types, disabled and read-only controls.
 * Forms with JS-only rules keep using their own error state (`Field` / `Input error=`).
 */

const SKIP_TYPES = new Set(['hidden', 'checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'image', 'range', 'color']);
const ERR_ATTR = 'data-live-error';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isControl(t: EventTarget | null): t is Control {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
}

function eligible(el: Control): boolean {
  if (el.disabled || el.closest('[data-no-live-validate]')) return false;
  if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return false;
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly) return false;
  return true;
}

function noun(n: number, one: string) { return `${n} ${one}${n === 1 ? '' : 's'}`; }

function messageFor(el: Control, blurred: boolean): string {
  const value = el.value;
  const len = value.length;
  if (el.required && !value.trim()) return blurred ? 'This field is required' : '';
  if (!value) return '';
  const hasLen = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  if (hasLen) {
    const min = el.minLength;
    if (min > 0 && len < min) return `Enter at least ${noun(min, 'character')} (you have ${len})`;
    const max = el.maxLength;
    if (max >= 0 && len > max) return `Use at most ${noun(max, 'character')}`;
  }
  if (el instanceof HTMLInputElement) {
    if (el.type === 'email' && el.validity.typeMismatch) return 'Enter a valid email address';
    if (el.type === 'url' && el.validity.typeMismatch) return 'Enter a valid link starting with http:// or https://';
    if (el.type === 'number') {
      if (el.validity.badInput) return 'Enter a valid number';
      if (el.validity.rangeUnderflow) return `Minimum is ${el.min}`;
      if (el.validity.rangeOverflow) return `Maximum is ${el.max}`;
      if (el.validity.stepMismatch) return Number(el.step) === 1 ? 'Enter a whole number' : 'Enter a valid number';
    }
    if (el.validity.patternMismatch) return el.title || 'Invalid format';
  }
  return '';
}

function ownErrorShown(el: Control): boolean {
  if (el.getAttribute('aria-invalid') === 'true') return true;
  const next = (el.parentElement?.nextElementSibling ?? null) as HTMLElement | null;
  const sib = el.nextElementSibling as HTMLElement | null;
  const isOther = (n: HTMLElement | null) => !!n && n.getAttribute('role') === 'alert' && !n.hasAttribute(ERR_ATTR);
  return isOther(sib) || isOther(next);
}

function slotFor(el: Control): Element {
  const parent = el.parentElement;
  if (parent) {
    const cs = getComputedStyle(parent);
    const rowFlex = cs.display.includes('flex') && !cs.flexDirection.startsWith('column');
    if (rowFlex || cs.position === 'relative' && parent.children.length > 1) return parent;
  }
  return el;
}

function findError(el: Control): HTMLElement | null {
  const slot = slotFor(el);
  const n = slot.nextElementSibling as HTMLElement | null;
  return n && n.hasAttribute(ERR_ATTR) && n.dataset.for === (el.id || el.name || '') ? n : null;
}

function show(el: Control, message: string) {
  const existing = findError(el);
  if (!message) {
    existing?.remove();
    el.removeAttribute('data-live-invalid');
    if (el.getAttribute('aria-describedby')?.endsWith('-live-err')) el.removeAttribute('aria-describedby');
    return;
  }
  el.setAttribute('data-live-invalid', 'true');
  if (existing) { if (existing.textContent !== message) existing.textContent = message; return; }
  const p = document.createElement('p');
  p.setAttribute(ERR_ATTR, '');
  p.setAttribute('role', 'alert');
  p.dataset.for = el.id || el.name || '';
  p.className = 'text-[12px] text-error mt-1';
  p.textContent = message;
  slotFor(el).after(p);
}

function run(t: EventTarget | null, blurred: boolean) {
  if (!isControl(t) || !eligible(t)) return;
  if (ownErrorShown(t)) { findError(t)?.remove(); return; }
  show(t, messageFor(t, blurred));
}

let installed = false;

export function installLiveFieldValidation() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('input', e => run(e.target, false), true);
  document.addEventListener('change', e => run(e.target, true), true);
  document.addEventListener('focusout', e => run(e.target, true), true);
  // native submit validation (forms without noValidate): show our message instead of the browser bubble
  document.addEventListener('invalid', e => {
    e.preventDefault();
    run(e.target, true);
  }, true);
}
