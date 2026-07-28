import type { Agent, AlertRule, LogEntry, Run } from '../types';

const now = Date.now();
const ago = (ms: number) => new Date(now - ms).toISOString();

/** Deterministic pseudo-random so the fixtures look organic but stay stable. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function throughputSeries(seed: number, base: number): number[] {
  const rand = seeded(seed);
  return Array.from({ length: 24 }, (_, i) => {
    // Daytime bump so the sparkline has a believable shape.
    const timeOfDay = Math.sin((i / 24) * Math.PI) * 0.6 + 0.4;
    return Math.round(base * timeOfDay * (0.7 + rand() * 0.6));
  });
}

export const AGENTS: Agent[] = [
  {
    id: 'agt_support',
    name: 'Support Triage',
    description:
      'Reads inbound tickets, classifies intent and drafts a first response.',
    model: 'claude-opus-5',
    status: 'healthy',
    environment: 'production',
    successRate: 0.982,
    p95LatencyMs: 2840,
    runsToday: 1284,
    errorsToday: 23,
    tokensToday: 4_120_000,
    costTodayUsd: 61.8,
    lastRunAt: ago(42_000),
    throughput: throughputSeries(11, 60),
  },
  {
    id: 'agt_research',
    name: 'Research Digest',
    description:
      'Sweeps sources each morning and produces a briefing with citations.',
    model: 'claude-opus-5',
    status: 'degraded',
    environment: 'production',
    successRate: 0.874,
    p95LatencyMs: 18_400,
    runsToday: 96,
    errorsToday: 12,
    tokensToday: 2_880_000,
    costTodayUsd: 43.2,
    lastRunAt: ago(8 * 60_000),
    throughput: throughputSeries(23, 6),
  },
  {
    id: 'agt_codereview',
    name: 'Code Review Bot',
    description:
      'Reviews pull requests, flags defects and posts inline comments.',
    model: 'claude-opus-5',
    status: 'healthy',
    environment: 'production',
    successRate: 0.956,
    p95LatencyMs: 9_200,
    runsToday: 342,
    errorsToday: 15,
    tokensToday: 6_540_000,
    costTodayUsd: 98.1,
    lastRunAt: ago(3 * 60_000),
    throughput: throughputSeries(37, 18),
  },
  {
    id: 'agt_enrich',
    name: 'Data Enrichment',
    description:
      'Resolves company records against third party sources and normalises them.',
    model: 'claude-haiku-4-5',
    status: 'failing',
    environment: 'production',
    successRate: 0.612,
    p95LatencyMs: 5_100,
    runsToday: 2_140,
    errorsToday: 830,
    tokensToday: 1_240_000,
    costTodayUsd: 8.7,
    lastRunAt: ago(31_000),
    throughput: throughputSeries(53, 95),
  },
  {
    id: 'agt_billing',
    name: 'Billing Reconciler',
    description:
      'Matches invoices against payments and escalates anything that will not reconcile.',
    model: 'claude-sonnet-5',
    status: 'healthy',
    environment: 'production',
    successRate: 0.994,
    p95LatencyMs: 3_600,
    runsToday: 418,
    errorsToday: 2,
    tokensToday: 890_000,
    costTodayUsd: 12.4,
    lastRunAt: ago(12 * 60_000),
    throughput: throughputSeries(71, 20),
  },
  {
    id: 'agt_onboard',
    name: 'Onboarding Guide',
    description:
      'Walks new workspaces through setup and answers configuration questions.',
    model: 'claude-sonnet-5',
    status: 'idle',
    environment: 'staging',
    successRate: 0.91,
    p95LatencyMs: 4_300,
    runsToday: 0,
    errorsToday: 0,
    tokensToday: 0,
    costTodayUsd: 0,
    lastRunAt: ago(19 * 3600_000),
    throughput: new Array(24).fill(0),
  },
];

const RUN_SUMMARIES: Record<string, string[]> = {
  agt_support: [
    'Ticket #48210 — cannot reset password',
    'Ticket #48209 — billing charged twice',
    'Ticket #48207 — SSO login loop',
    'Ticket #48204 — export stuck at 90%',
    'Ticket #48201 — request to close account',
  ],
  agt_research: [
    'Morning digest — infrastructure sector',
    'Ad hoc — competitor pricing changes',
    'Morning digest — regulatory filings',
  ],
  agt_codereview: [
    'PR #1442 — refactor auth middleware',
    'PR #1441 — add retry to webhook sender',
    'PR #1438 — bump dependency versions',
    'PR #1435 — fix pagination off-by-one',
  ],
  agt_enrich: [
    'Batch 8821 — 500 company records',
    'Batch 8820 — 500 company records',
    'Batch 8819 — 500 company records',
  ],
  agt_billing: [
    'Reconcile invoice batch 2026-07-28',
    'Reconcile invoice batch 2026-07-27',
  ],
  agt_onboard: ['Workspace acme-corp setup walkthrough'],
};

const ERRORS = [
  'Upstream provider returned 429 after 3 retries',
  'Tool `lookup_company` timed out after 30s',
  'Response failed schema validation: missing field `domain`',
  'Context window exceeded before completion',
  'Connection reset while streaming response',
];

function buildRuns(): Run[] {
  const runs: Run[] = [];
  let counter = 0;

  for (const agent of AGENTS) {
    const rand = seeded(agent.id.length * 977 + 13);
    const summaries = RUN_SUMMARIES[agent.id] ?? ['Scheduled run'];
    const count = agent.status === 'idle' ? 2 : 12;

    for (let i = 0; i < count; i++) {
      const roll = rand();
      const failed = roll > agent.successRate;
      const running = i === 0 && agent.status !== 'idle' && rand() > 0.6;

      runs.push({
        id: `run_${(++counter).toString().padStart(5, '0')}`,
        agentId: agent.id,
        status: running ? 'running' : failed ? 'failed' : 'succeeded',
        startedAt: ago(i * 7 * 60_000 + Math.floor(rand() * 120_000)),
        durationMs: Math.round(agent.p95LatencyMs * (0.4 + rand() * 0.9)),
        inputTokens: Math.round(1200 + rand() * 8000),
        outputTokens: Math.round(200 + rand() * 2400),
        costUsd: Number((0.01 + rand() * 0.28).toFixed(4)),
        toolCalls: Math.floor(rand() * 7),
        error: failed ? ERRORS[Math.floor(rand() * ERRORS.length)] : undefined,
        summary: summaries[i % summaries.length],
      });
    }
  }

  return runs.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

export const RUNS: Run[] = buildRuns();

const LOG_TEMPLATES: Array<{ level: LogEntry['level']; message: string; tool?: string }> = [
  { level: 'info', message: 'Run started, context assembled' },
  { level: 'debug', message: 'Loaded 4 prior turns from session store' },
  { level: 'info', message: 'Called tool with 2 arguments', tool: 'search_knowledge_base' },
  { level: 'debug', message: 'Tool returned 8 results, 1.2KB' },
  { level: 'info', message: 'Called tool', tool: 'fetch_ticket' },
  { level: 'warn', message: 'Retrying after transient upstream error (attempt 2/3)' },
  { level: 'info', message: 'Model produced final response, 640 output tokens' },
  { level: 'info', message: 'Run completed' },
];

export function buildLogs(runId: string, agentId: string, failed: boolean): LogEntry[] {
  const rand = seeded(runId.length * 31 + runId.charCodeAt(runId.length - 1));
  const base = Date.now() - 5 * 60_000;

  const entries = LOG_TEMPLATES.map((template, i) => ({
    id: `${runId}_log_${i}`,
    runId,
    agentId,
    timestamp: new Date(base + i * 900 + Math.floor(rand() * 400)).toISOString(),
    level: template.level,
    message: template.message,
    tool: template.tool,
    durationMs: template.tool ? Math.round(200 + rand() * 1800) : undefined,
  }));

  if (failed) {
    entries.push({
      id: `${runId}_log_err`,
      runId,
      agentId,
      timestamp: new Date(base + entries.length * 900).toISOString(),
      level: 'error',
      message: ERRORS[Math.floor(rand() * ERRORS.length)],
      tool: undefined,
      durationMs: undefined,
    });
  }

  return entries;
}

export const ALERT_RULES: AlertRule[] = [
  {
    id: 'alr_001',
    name: 'Error rate spike',
    condition: 'Error rate above 5% over 15 minutes',
    enabled: true,
    channel: 'slack',
    triggeredThisWeek: 4,
    lastTriggeredAt: ago(52 * 60_000),
  },
  {
    id: 'alr_002',
    name: 'Latency regression',
    condition: 'p95 latency above 15s over 30 minutes',
    enabled: true,
    channel: 'slack',
    triggeredThisWeek: 2,
    lastTriggeredAt: ago(6 * 3600_000),
  },
  {
    id: 'alr_003',
    name: 'Daily spend ceiling',
    condition: 'Fleet cost above $500 in a single day',
    enabled: true,
    channel: 'email',
    triggeredThisWeek: 0,
  },
  {
    id: 'alr_004',
    name: 'Agent gone silent',
    condition: 'No successful run in 2 hours during business hours',
    enabled: false,
    channel: 'pagerduty',
    triggeredThisWeek: 1,
    lastTriggeredAt: ago(3 * 86400_000),
  },
  {
    id: 'alr_005',
    name: 'Tool failure loop',
    condition: 'Same tool fails 10 times consecutively',
    enabled: true,
    channel: 'pagerduty',
    triggeredThisWeek: 7,
    lastTriggeredAt: ago(14 * 60_000),
  },
];
