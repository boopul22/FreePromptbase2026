// The path Astro actually routes on: it collapses duplicate slashes and
// decodeURI()s the pathname, so `/%61dmin/cms` and `//admin/cms` both render
// /admin/cms. Auth and cache gates must test this form, not the raw pathname,
// or those spellings skip them. Redirect and canonical logic keeps the raw path.
export function routedPath(pathname: string): string {
	const collapsed = pathname.replace(/\/{2,}/g, '/');
	try {
		return decodeURI(collapsed).replace(/\/{2,}/g, '/');
	} catch {
		return collapsed;
	}
}
