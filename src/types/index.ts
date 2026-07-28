export type AgentStatus = 'healthy' | 'degraded' | 'failing' | 'idle';

export type RunStatus = 'succeeded' | 'failed' | 'running' | 'cancelled';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: AgentStatus;
  /** Environment the agent is deployed to. */
  environment: 'production' | 'staging';
  /** Rolling 24h success rate, 0..1. */
  successRate: number;
  /** p95 latency in milliseconds. */
  p95LatencyMs: number;
  runsToday: number;
  errorsToday: number;
  tokensToday: number;
  costTodayUsd: number;
  lastRunAt: string;
  /** Requests per minute over the last 24 buckets, for the sparkline. */
  throughput: number[];
}

export interface Run {
  id: string;
  agentId: string;
  status: RunStatus;
  startedAt: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCalls: number;
  /** Present when the run failed. */
  error?: string;
  /** First line of the triggering input, for the list row. */
  summary: string;
}

export interface LogEntry {
  id: string;
  runId: string;
  agentId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  /** Tool name when the entry describes a tool call. */
  tool?: string;
  durationMs?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  /** Human readable condition, e.g. "Error rate above 5%". */
  condition: string;
  enabled: boolean;
  channel: 'slack' | 'email' | 'pagerduty';
  /** Number of times it fired in the last 7 days. */
  triggeredThisWeek: number;
  lastTriggeredAt?: string;
}

export interface FleetMetrics {
  totalAgents: number;
  healthyAgents: number;
  runsToday: number;
  errorRate: number;
  avgP95LatencyMs: number;
  costTodayUsd: number;
  tokensToday: number;
}
