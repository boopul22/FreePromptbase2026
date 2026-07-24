import type { APIRoute } from 'astro';
import { getSkill } from '../../data/skills';

export const GET: APIRoute = ({ params }) => {
	const skill = getSkill(params.slug ?? '');
	if (!skill) return new Response('Not found', { status: 404 });

	return new Response(skill.skillMd, {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Content-Disposition': `attachment; filename="${skill.slug}-SKILL.md"`,
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
