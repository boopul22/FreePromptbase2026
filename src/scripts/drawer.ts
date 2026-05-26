/**
 * Shared off-canvas drawer binder. Used by both the mobile nav drawer
 * (Header.astro) and the admin sidebar drawer (AdminSidebar.astro).
 *
 * Open/close animation is CSS-only (see drawer.css). This module only:
 *   - wires up the open-trigger buttons
 *   - locks page scroll in an iOS-Safari-safe way (position:fixed body)
 *   - closes on link clicks + [data-drawer-close] buttons
 *   - falls back to manual backdrop-click handling on UAs without `closedby`
 */

let activeCount = 0;
let savedY = 0;

function lockScroll() {
	if (activeCount++ > 0) return;
	savedY = window.scrollY;
	const sbw = window.innerWidth - document.documentElement.clientWidth;
	const body = document.body.style;
	body.position = 'fixed';
	body.top = `-${savedY}px`;
	body.left = '0';
	body.right = '0';
	body.width = '100%';
	if (sbw > 0) body.paddingRight = `${sbw}px`;
}

function unlockScroll() {
	if (--activeCount > 0) return;
	if (activeCount < 0) activeCount = 0;
	const body = document.body.style;
	body.position = '';
	body.top = '';
	body.left = '';
	body.right = '';
	body.width = '';
	body.paddingRight = '';
	// Restore scroll AFTER style reset, otherwise iOS Safari jumps to top.
	window.scrollTo(0, savedY);
}

export function bindDrawer(dialogId: string, openSelector: string) {
	const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
	if (!dialog) return;

	let opener: HTMLElement | null = null;

	function open(trigger: HTMLElement) {
		if (dialog!.open) return;
		opener = trigger;
		lockScroll();
		try {
			dialog!.showModal();
		} catch {
			dialog!.setAttribute('open', '');
		}
	}

	document
		.querySelectorAll<HTMLElement>(openSelector)
		.forEach((btn) => btn.addEventListener('click', () => open(btn)));

	// `closedby="any"` (Chrome 134+, FF 140+) makes the backdrop dismiss
	// the dialog natively. On UAs without it, fall back to event.target===dialog.
	const hasClosedBy = 'closedBy' in dialog;

	dialog.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		if (target.closest('[data-drawer-close]')) {
			e.preventDefault();
			dialog.close();
			return;
		}
		if (!hasClosedBy && target === dialog) {
			dialog.close();
		}
	});

	dialog.querySelectorAll('a[href]').forEach((a) => {
		a.addEventListener('click', () => dialog.close());
	});

	dialog.addEventListener('close', () => {
		unlockScroll();
		opener?.focus();
		opener = null;
	});
}
