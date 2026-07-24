// ---------------------------------------------------------------------------
// Editorial data access — thin compatibility wrapper over the CMS data layer.
// Both /blog and /news use this module so routing stays aligned with content_type.
// ---------------------------------------------------------------------------

import { getDB } from './db';
import {
	getPublishedPosts,
	getPostBySlug as cmsGetPostBySlug,
	getRelatedPosts as cmsGetRelatedPosts,
	type Post as CmsPost,
} from './cms';

export type Post = CmsPost;

/** All published posts, newest first. */
export async function getAllPosts(): Promise<Post[]> {
	const { posts } = await getPublishedPosts(getDB(), { limit: 100 });
	return posts;
}

/** A single published post by slug, or undefined. */
export async function getPostBySlug(slug: string): Promise<Post | undefined> {
	const post = await cmsGetPostBySlug(getDB(), slug);
	return post ?? undefined;
}

/** Related posts: pull by the post's `relatedSlugs` if set, else most recent others. */
export async function getRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
	if (post.relatedSlugs.length > 0) {
		const related = await cmsGetRelatedPosts(getDB(), post.relatedSlugs);
		const sameSection = related.filter((candidate) => candidate.contentType === post.contentType);
		if (sameSection.length > 0) return sameSection.slice(0, limit);
	}
	const { posts } = await getPublishedPosts(getDB(), { limit: 20 });
	return posts
		.filter((candidate) => candidate.slug !== post.slug && candidate.contentType === post.contentType)
		.slice(0, limit);
}

/** Backwards-compat: blog templates may still call this; CMS stores read_time as a string. */
export function postReadTime(post: Post): number {
	const match = post.readTime?.match(/(\d+)/);
	return match ? Number(match[1]) : 1;
}
