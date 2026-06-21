// Shared toast — one global, reusable notification used across the public site
// and the admin. Minimal pill, bottom-center, state-only (success/error/info).
// Replaces the ad-hoc helpers that used to live in social.ts and media.astro.
//
// Usage:
//   import { toast } from '../scripts/toast';
//   toast('Saved', 'success');
//   toast('Upload failed — try again', 'error');

type ToastType = 'success' | 'error' | 'info';

const ICONS: Record<ToastType, string> = {
	// 1em, currentColor, inherits the dot colour set per-type below.
	success:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
	error:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
	info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/><circle cx="12" cy="12" r="9"/></svg>',
};

// Per-type accent for the leading glyph (the pill itself stays neutral navy).
const ICON_COLOR: Record<ToastType, string> = {
	success: '#34d399', // emerald
	error: '#f87171', // red
	info: '#FFE66A', // brand yellow
};

const DURATION: Record<ToastType, number> = {
	success: 2200,
	error: 3200,
	info: 2200,
};

let hideTimer: number | undefined;

function ensureEl(): HTMLDivElement {
	let el = document.getElementById('app-toast') as HTMLDivElement | null;
	if (!el) {
		el = document.createElement('div');
		el.id = 'app-toast';
		el.className = 'app-toast';
		el.setAttribute('role', 'status');
		el.innerHTML = '<span class="app-toast__icon" aria-hidden="true"></span><span class="app-toast__msg"></span>';
		document.body.appendChild(el);
	}
	return el;
}

export function toast(message: string, type: ToastType = 'info'): void {
	const el = ensureEl();
	const icon = el.querySelector('.app-toast__icon') as HTMLElement;
	const msg = el.querySelector('.app-toast__msg') as HTMLElement;

	icon.innerHTML = ICONS[type];
	icon.style.color = ICON_COLOR[type];
	msg.textContent = message;
	// Errors interrupt; everything else is polite.
	el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

	// Force reflow so re-showing an existing toast re-runs the enter transition.
	clearTimeout(hideTimer);
	el.classList.remove('is-visible');
	void el.offsetWidth;
	requestAnimationFrame(() => el.classList.add('is-visible'));

	hideTimer = window.setTimeout(() => {
		el.classList.remove('is-visible');
	}, DURATION[type]);
}
