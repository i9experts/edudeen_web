import { UR, UR_PATTERNS } from './ur';

/**
 * Translates the buyer-facing interface into Urdu in place. Every text node
 * and label attribute whose (trimmed) English text is in the dictionary is
 * swapped for its Urdu version, and kept Urdu as React re-renders it; on
 * stop() every swapped string is put back. Seller-written content (product
 * names, descriptions, reviews) almost never matches a dictionary entry, so
 * it stays exactly as written — and anything inside [translate="no"] is skipped.
 */

const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'] as const;
const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT']);

const textOriginal = new Map<Text, string>();
const attrOriginal = new Map<Element, Map<string, string>>();
let observer: MutationObserver | null = null;

export function translateText(s: string): string | null {
  const trimmed = s.trim();
  if (!trimmed || ARABIC.test(trimmed) || !LATIN.test(trimmed)) return null;
  let hit: string | undefined = UR[trimmed];
  if (hit === undefined) {
    for (const [re, fn] of UR_PATTERNS) {
      const m = trimmed.match(re);
      if (m) { hit = fn(m); break; }
    }
  }
  if (hit === undefined) return null;
  return s.replace(trimmed, hit);
}

function skipped(el: Element | null) {
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  return !!el.closest('[translate="no"],[data-no-translate],[contenteditable="true"]');
}

function doText(node: Text) {
  const value = node.nodeValue ?? '';
  if (skipped(node.parentElement)) return;
  const next = translateText(value);
  if (next === null || next === value) return;
  textOriginal.set(node, value);
  node.nodeValue = next;
}

function doAttrs(el: Element) {
  if (skipped(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const next = translateText(v);
    if (next === null || next === v) continue;
    let saved = attrOriginal.get(el);
    if (!saved) { saved = new Map(); attrOriginal.set(el, saved); }
    saved.set(a, v);
    el.setAttribute(a, next);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { doText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP_TAGS.has(el.tagName)) return;
  doAttrs(el);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doAttrs(n as Element);
    n = tw.nextNode();
  }
}

export function startUrdu(root: HTMLElement = document.body) {
  if (observer) return;
  walk(root);
  observer = new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') doText(r.target as Text);
      else if (r.type === 'attributes') doAttrs(r.target as Element);
      else r.addedNodes.forEach(walk);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
}

export function stopUrdu() {
  observer?.disconnect();
  observer = null;
  // Put the English back wherever the node still shows our translation.
  textOriginal.forEach((en, node) => {
    if (node.isConnected && node.nodeValue !== null && ARABIC.test(node.nodeValue)) node.nodeValue = en;
  });
  attrOriginal.forEach((saved, el) => {
    if (!el.isConnected) return;
    saved.forEach((en, a) => { const v = el.getAttribute(a); if (v && ARABIC.test(v)) el.setAttribute(a, en); });
  });
  textOriginal.clear();
  attrOriginal.clear();
}
