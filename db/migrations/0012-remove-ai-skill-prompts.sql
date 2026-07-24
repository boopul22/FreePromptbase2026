-- Skills are distributed as SKILL.md packages, not prompt-library entries.
DELETE FROM prompts
WHERE slug IN (
	'agent-workflow-architect',
	'mcp-tool-contract-designer',
	'agent-evaluation-and-security-review',
	'multi-agent-content-quality-pipeline'
);
