// Shared button loading state — disables a button, swaps its contents for an
// inline spinner (+ optional label), runs the async task, then restores the
// original markup whether it succeeds or fails. One vocabulary everywhere.
//
// Usage:
//   await withButtonLoading(btn, () => fetch(...), { loadingLabel: 'Saving…' });
//   try { await withButtonLoading(btn, task); } catch { toast(msg, 'error'); }

// 1em spinner, currentColor — works on any button without the Material font.
const SPINNER =
	'<svg class="spinner" viewBox="0 0 24 24" width="1em" height="1em" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="42" stroke-dashoffset="14" opacity="0.9"/></svg>';

interface Options {
	/** Text shown next to the spinner while loading. Omit to show spinner only. */
	loadingLabel?: string;
}

export async function withButtonLoading<T>(
	button: HTMLButtonElement,
	task: () => Promise<T>,
	opts: Options = {},
): Promise<T> {
	const originalHTML = button.innerHTML;
	const wasDisabled = button.disabled;

	button.disabled = true;
	button.setAttribute('aria-busy', 'true');
	button.classList.add('is-loading');
	button.innerHTML = opts.loadingLabel
		? `${SPINNER}<span>${opts.loadingLabel}</span>`
		: SPINNER;

	try {
		return await task();
	} finally {
		button.innerHTML = originalHTML;
		button.disabled = wasDisabled;
		button.removeAttribute('aria-busy');
		button.classList.remove('is-loading');
	}
}
