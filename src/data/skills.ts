export interface AgentSkill {
	slug: string;
	title: string;
	description: string;
	category: string;
	version: string;
	command: string;
	skillMd: string;
}

const baseUrl = 'https://freepromptbase.com';

export const skills: AgentSkill[] = [
	{
		slug: 'agent-workflow-architect',
		title: 'Agent Workflow Architect',
		description:
			'Build small, reviewable AI agent workflows with clear ownership, safe tool boundaries, and human approval points.',
		category: 'Workflow design',
		version: '1.0.0',
		command: `npx skills add ${baseUrl}/skills/agent-workflow-architect.md`,
		skillMd: `---
name: agent-workflow-architect
version: 1.0.0
description: Design review-first AI agent workflows with explicit ownership, permissions, and checkpoints.
---

# Agent Workflow Architect

Turn a goal into a small workflow that people can inspect and run safely.

## Process

1. Clarify the outcome, the people affected, available tools, data sensitivity, time budget, and irreversible actions.
2. State the outcome and the non-goals before naming agents.
3. Give each agent one job. Do not combine research, drafting, approval, and publishing in the same role.
4. For every step, label the available tool permission: read, draft, execute, or prohibited.
5. Add a human approval point before publishing, sending, purchasing, deleting, or changing production data.
6. Include a failure path, rollback action, and success checks.

## Deliverable

Return a compact runbook with inputs, roles, handoffs, permissions, checkpoints, failure handling, and a test plan. End with the first task for the lead agent.`,
	},
	{
		slug: 'mcp-tool-contract-designer',
		title: 'MCP Tool Contract Designer',
		description:
			'Design focused MCP tools with strict inputs, clear side effects, confirmation rules, and error recovery an agent can follow.',
		category: 'MCP development',
		version: '1.0.0',
		command: `npx skills add ${baseUrl}/skills/mcp-tool-contract-designer.md`,
		skillMd: `---
name: mcp-tool-contract-designer
version: 1.0.0
description: Design safe, narrow Model Context Protocol tools for coding agents.
---

# MCP Tool Contract Designer

Design tools that do one thing clearly and make unsafe actions hard to trigger.

## Process

1. Define the smallest useful capability. Split mixed read, write, and publish operations into separate tools.
2. Specify every input field: type, required state, validation, default, and example.
3. Specify success, partial-success, and no-result outputs.
4. Name all side effects. Require a confirmation token before destructive or external actions.
5. Use least-privilege authentication. Explain retries and idempotency.
6. Give errors names that help the agent recover, not just a raw provider message.

## Deliverable

Return the tool name, purpose, JSON schemas, permission requirements, side effects, error contract, and examples for success, ambiguous input, and safe refusal.`,
	},
	{
		slug: 'agent-evaluation-security-review',
		title: 'Agent Evaluation & Security Review',
		description:
			'Write concrete adversarial tests for prompt injection, tool misuse, unsafe actions, retries, and release readiness.',
		category: 'Testing and security',
		version: '1.0.0',
		command: `npx skills add ${baseUrl}/skills/agent-evaluation-security-review.md`,
		skillMd: `---
name: agent-evaluation-security-review
version: 1.0.0
description: Create practical security and reliability evaluations for AI agents before release.
---

# Agent Evaluation & Security Review

Test the real agent, its real tools, and the actions it can take.

## Process

1. List the allowed actions and hard boundaries.
2. Rank risks, including prompt injection, wrong-recipient actions, leaked data, looping, destructive commands, and false completion claims.
3. Write adversarial cases with setup, input, expected safe behavior, pass condition, and severity.
4. Test permission escalation, confirmations, retries, partial failures, and rollback.
5. Define traces, logs, redaction rules, alerts, and a human review queue.
6. Set release thresholds and rollback triggers.

## Deliverable

Return a test matrix that a team can run this week. Mark any action that should remain human-approved.`,
	},
	{
		slug: 'multi-agent-content-pipeline',
		title: 'Multi-Agent Content Pipeline',
		description:
			'Run content through research, drafting, fact checks, voice editing, and editor approval without giving an agent direct publish access.',
		category: 'Content operations',
		version: '1.0.0',
		command: `npx skills add ${baseUrl}/skills/multi-agent-content-pipeline.md`,
		skillMd: `---
name: multi-agent-content-pipeline
version: 1.0.0
description: Run a review-first multi-agent workflow for original, sourced content.
---

# Multi-Agent Content Pipeline

Keep research, writing, verification, and publishing separate.

## Process

1. Create a source ledger that separates verified facts, assumptions, and original analysis.
2. Assign focused roles for research, outline, drafting, fact-checking, voice editing, and final approval.
3. Define each role's input, output, quality bar, forbidden behavior, and handoff.
4. Remove repeated ideas and generic filler before editorial review.
5. Flag claims that require a primary source.
6. Keep publishing human-approved. Agents may prepare drafts and checklists, but cannot publish.

## Deliverable

Return a runbook, content brief template, source ledger format, and final publish checklist.`,
	},
];

export const getSkill = (slug: string) => skills.find((skill) => skill.slug === slug);
