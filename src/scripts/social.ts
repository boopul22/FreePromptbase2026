// ---------------------------------------------------------------------------
// Client-side wiring for the social actions on a prompt (like / save / share).
// Each wire* function is idempotent and can be called from every script run
// without doubling up listeners. Two visual styles are supported per action:
//
//   - Card icon button: small circular icon on PromptCard. Toggles an `is-*`
//     class on the button and the SVG's fill attribute.
//   - Detail pill: full-width pill on /[slug] with a text label + count badge.
//     Recognised via the `detail-save-btn` / `detail-like-btn` class. Same
//     state transitions but with background/border swaps.
//
// Selectors used:
//   [data-like]   → like toggle button (heart)
//   [data-save]   → save toggle button (bookmark)
//   [data-share]  → share button (Web Share API + copy fallback)
//   [data-prompt][data-slug] → ancestor card
// ---------------------------------------------------------------------------

const PILL_SAVED = ['bg-primary', 'text-link', 'border-primary'];
const PILL_UNSAVED = [
	'bg-white',
	'text-text-primary',
	'border-gray-200',
	'hover:border-primary',
	'hover:text-primary',
];
const PILL_LIKED = ['bg-rose-50', 'text-rose-600', 'border-rose-200'];
const PILL_UNLIKED = [
	'bg-white',
	'text-text-primary',
	'border-gray-200',
	'hover:border-rose-400',
	'hover:text-rose-500',
];

/** Compact 1.2k-style format for counts on the card pill. */
function fmt(n: number): string {
	if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
	return String(n);
}

function slugFor(btn: HTMLElement): string | null {
	return (
		btn.dataset.slug ||
		btn.closest<HTMLElement>('[data-prompt][data-slug]')?.dataset.slug ||
		null
	);
}

// ---------------------------------------------------------------------------
// Save (bookmark)
// ---------------------------------------------------------------------------

function setSavedVisual(btn: HTMLElement, saved: boolean, countOverride?: number) {
	btn.dataset.saved = String(saved);
	btn.setAttribute('aria-pressed', String(saved));
	btn.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save prompt');

	if (btn.classList.contains('detail-save-btn')) {
		btn.classList.remove(...PILL_SAVED, ...PILL_UNSAVED);
		btn.classList.add(...(saved ? PILL_SAVED : PILL_UNSAVED));
	} else {
		btn.classList.toggle('is-saved', saved);
		const icon = btn.querySelector<SVGElement>('.save-icon');
		if (icon) icon.setAttribute('fill', saved ? 'currentColor' : 'none');
	}

	const label = btn.querySelector<HTMLElement>('[data-save-label]');
	if (label) label.textContent = saved ? 'Saved' : 'Save';

	if (countOverride !== undefined) {
		const countEl = btn.querySelector<HTMLElement>('[data-save-count]');
		if (countEl) countEl.textContent = String(countOverride);
	}
}

export function wireSave() {
	document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((btn) => {
		if (btn.dataset.wired === 'save') return;
		btn.dataset.wired = 'save';
		btn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			const slug = slugFor(btn);
			if (!slug) return;

			const previous = btn.dataset.saved === 'true';
			const optimistic = !previous;
			const card = btn.closest<HTMLElement>('[data-prompt]');
			const startCount = Number(
				btn.querySelector<HTMLElement>('[data-save-count]')?.textContent ??
					card?.dataset.saveCount ??
					card?.dataset.popularity ??
					0,
			);
			const optimisticCount = Math.max(0, startCount + (optimistic ? 1 : -1));
			setSavedVisual(btn, optimistic, optimisticCount);
			if (card) {
				card.dataset.saveCount = String(optimisticCount);
				card.dataset.popularity = String(optimisticCount);
			}

			try {
				const res = await fetch(`/api/prompts/${slug}/save`, { method: 'POST' });
				if (!res.ok) throw new Error(String(res.status));
				const data = (await res.json()) as { saved: boolean; count: number };
				setSavedVisual(btn, data.saved, data.count);
				if (card) {
					card.dataset.saveCount = String(data.count);
					card.dataset.popularity = String(data.count);
				}
			} catch {
				setSavedVisual(btn, previous, startCount);
				if (card) {
					card.dataset.saveCount = String(startCount);
					card.dataset.popularity = String(startCount);
				}
			}
		});
	});
}

// ---------------------------------------------------------------------------
// Like (heart) — drives the card's always-visible like pill and the detail
// page's like button. Updates the count badge in both places.
// ---------------------------------------------------------------------------

function setLikedVisual(btn: HTMLElement, liked: boolean, count?: number) {
	btn.dataset.liked = String(liked);
	btn.setAttribute('aria-pressed', String(liked));

	const isDetail = btn.classList.contains('detail-like-btn');
	if (isDetail) {
		// Detail button shows a visible "Like"/"Liked" text label + count, which
		// already forms the accessible name — an aria-label would clash with the
		// visible text (axe: label-content-name-mismatch).
		btn.removeAttribute('aria-label');
		btn.classList.remove(...PILL_LIKED, ...PILL_UNLIKED);
		btn.classList.add(...(liked ? PILL_LIKED : PILL_UNLIKED));
	} else {
		// Card pill only shows the count, so fold it into the accessible name so
		// the visible "1" is contained in the label (axe: label-content-name-mismatch).
		const verb = liked ? 'Unlike prompt' : 'Like prompt';
		const n = count ?? Number(btn.querySelector<HTMLElement>('[data-like-count-text]')?.dataset.raw ?? 0);
		btn.setAttribute('aria-label', n > 0 ? `${verb}, ${fmt(n)} likes` : verb);
		btn.classList.toggle('is-liked', liked);
	}

	const icon = btn.querySelector<SVGElement>('.like-icon');
	if (icon) icon.setAttribute('fill', liked ? 'currentColor' : 'none');

	const label = btn.querySelector<HTMLElement>('[data-like-label]');
	if (label) label.textContent = liked ? 'Liked' : 'Like';

	if (count !== undefined) {
		const countEl = btn.querySelector<HTMLElement>('[data-like-count-text]');
		if (countEl) {
			countEl.dataset.raw = String(count);
			// Card pill hides count via :empty when 0. Detail page always shows.
			const isPill = !btn.classList.contains('detail-like-btn');
			countEl.textContent = isPill && count <= 0 ? '' : fmt(count);
		}
	}
}

export function wireLike() {
	document.querySelectorAll<HTMLButtonElement>('[data-like]').forEach((btn) => {
		if (btn.dataset.wired === 'like') return;
		btn.dataset.wired = 'like';
		btn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			const slug = slugFor(btn);
			if (!slug) return;

			const previous = btn.dataset.liked === 'true';
			const optimistic = !previous;
			const card = btn.closest<HTMLElement>('[data-prompt]');
			const startCount = Number(
				btn.querySelector<HTMLElement>('[data-like-count-text]')?.dataset.raw ??
					card?.dataset.likeCount ??
					0,
			);
			const optimisticCount = Math.max(0, startCount + (optimistic ? 1 : -1));
			setLikedVisual(btn, optimistic, optimisticCount);
			if (card) card.dataset.likeCount = String(optimisticCount);

			try {
				const res = await fetch(`/api/prompts/${slug}/like`, { method: 'POST' });
				if (!res.ok) throw new Error(String(res.status));
				const data = (await res.json()) as { liked: boolean; count: number };
				setLikedVisual(btn, data.liked, data.count);
				if (card) card.dataset.likeCount = String(data.count);
			} catch {
				setLikedVisual(btn, previous, startCount);
				if (card) card.dataset.likeCount = String(startCount);
			}
		});
	});
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------

export function wireShare() {
	document.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) => {
		if (btn.dataset.wired === 'share') return;
		btn.dataset.wired = 'share';
		btn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			const slug = slugFor(btn);
			if (!slug) return;
			const url = new URL(`/${slug}`, location.origin).toString();
			const title = btn.dataset.title || document.title;

			let shared = false;
			if (navigator.share) {
				try {
					await navigator.share({ title, url });
					shared = true;
				} catch {
					return; // user cancelled
				}
			}
			if (!shared) {
				try {
					await navigator.clipboard.writeText(url);
				} catch {
					prompt('Copy this link:', url);
				}
				showToast('Link copied');
			}

			fetch(`/api/prompts/${slug}/share`, { method: 'POST' }).catch(() => {});
		});
	});
}

function showToast(message: string) {
	let toast = document.getElementById('social-toast');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'social-toast';
		toast.className =
			'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-text-primary text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg opacity-0 transition-opacity duration-200 pointer-events-none';
		document.body.appendChild(toast);
	}
	toast.textContent = message;
	requestAnimationFrame(() => toast!.classList.replace('opacity-0', 'opacity-100'));
	clearTimeout((toast as HTMLElement & { _t?: number })._t);
	(toast as HTMLElement & { _t?: number })._t = window.setTimeout(() => {
		toast!.classList.replace('opacity-100', 'opacity-0');
	}, 1800);
}
