import { create } from 'zustand';

import { AGENTS, ALERT_RULES, RUNS, buildLogs } from '../services/mockData';
import type { Agent, AlertRule, FleetMetrics, LogEntry, Run } from '../types';

type StatusFilter = 'all' | 'healthy' | 'degraded' | 'failing' | 'idle';

interface FleetState {
  agents: Agent[];
  runs: Run[];
  alertRules: AlertRule[];
  loading: boolean;
  error: string | null;

  /** When true a timer pushes synthetic telemetry, mimicking a live feed. */
  liveMode: boolean;
  statusFilter: StatusFilter;
  searchQuery: string;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  setStatusFilter: (filter: StatusFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleLiveMode: () => void;
  toggleAlertRule: (id: string) => void;
  /** Applies one tick of simulated telemetry to every active agent. */
  tick: () => void;
}

const LATENCY_MS = 500;

export const useFleetStore = create<FleetState>((set, get) => ({
  agents: [],
  runs: [],
  alertRules: [],
  loading: true,
  error: null,
  liveMode: true,
  statusFilter: 'all',
  searchQuery: '',

  load: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
      set({
        agents: AGENTS,
        runs: RUNS,
        alertRules: ALERT_RULES,
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Could not reach the telemetry backend.' });
    }
  },

  refresh: async () => {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
    get().tick();
  },

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleLiveMode: () => set((state) => ({ liveMode: !state.liveMode })),

  toggleAlertRule: (id) =>
    set((state) => ({
      alertRules: state.alertRules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    })),

  tick: () =>
    set((state) => ({
      agents: state.agents.map((agent) => {
        if (agent.status === 'idle') return agent;

        // Nudge counters and shift the throughput window by one bucket.
        const newRuns = Math.floor(Math.random() * 4);
        const newErrors =
          Math.random() > agent.successRate ? Math.floor(Math.random() * 2) : 0;
        const lastBucket = agent.throughput[agent.throughput.length - 1] ?? 10;
        const nextBucket = Math.max(
          0,
          Math.round(lastBucket * (0.85 + Math.random() * 0.35)),
        );

        return {
          ...agent,
          runsToday: agent.runsToday + newRuns,
          errorsToday: agent.errorsToday + newErrors,
          tokensToday: agent.tokensToday + newRuns * 3200,
          costTodayUsd: Number(
            (agent.costTodayUsd + newRuns * 0.048).toFixed(2),
          ),
          p95LatencyMs: Math.round(
            agent.p95LatencyMs * (0.97 + Math.random() * 0.06),
          ),
          lastRunAt: newRuns > 0 ? new Date().toISOString() : agent.lastRunAt,
          throughput: [...agent.throughput.slice(1), nextBucket],
        };
      }),
    })),
}));

// ---------------------------------------------------------------------------
// Selectors — plain functions over the narrowest slice each one reads.
//
// These all build new arrays/objects, so they must NOT be passed straight to
// useFleetStore: the hook compares results by reference, a fresh reference every
// render reads as "changed", and React re-renders until it bails out with
// "The result of getSnapshot should be cached" / "Maximum update depth".
// Subscribe to the raw slices instead and wrap these in useMemo.
// ---------------------------------------------------------------------------

export function selectFilteredAgents(state: {
  agents: Agent[];
  statusFilter: StatusFilter;
  searchQuery: string;
}): Agent[] {
  const query = state.searchQuery.trim().toLowerCase();

  return state.agents.filter((agent) => {
    if (state.statusFilter !== 'all' && agent.status !== state.statusFilter) {
      return false;
    }
    if (!query) return true;
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.model.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query)
    );
  });
}

export function selectFleetMetrics(state: { agents: Agent[] }): FleetMetrics {
  const { agents } = state;
  if (agents.length === 0) {
    return {
      totalAgents: 0,
      healthyAgents: 0,
      runsToday: 0,
      errorRate: 0,
      avgP95LatencyMs: 0,
      costTodayUsd: 0,
      tokensToday: 0,
    };
  }

  const runsToday = agents.reduce((sum, a) => sum + a.runsToday, 0);
  const errorsToday = agents.reduce((sum, a) => sum + a.errorsToday, 0);
  const active = agents.filter((a) => a.status !== 'idle');

  return {
    totalAgents: agents.length,
    healthyAgents: agents.filter((a) => a.status === 'healthy').length,
    runsToday,
    errorRate: runsToday === 0 ? 0 : errorsToday / runsToday,
    avgP95LatencyMs:
      active.length === 0
        ? 0
        : Math.round(
            active.reduce((sum, a) => sum + a.p95LatencyMs, 0) / active.length,
          ),
    costTodayUsd: Number(
      agents.reduce((sum, a) => sum + a.costTodayUsd, 0).toFixed(2),
    ),
    tokensToday: agents.reduce((sum, a) => sum + a.tokensToday, 0),
  };
}

export function selectRunsForAgent(
  state: { runs: Run[] },
  agentId: string,
): Run[] {
  return state.runs.filter((run) => run.agentId === agentId);
}

export function selectRecentFailures(
  state: { runs: Run[] },
  limit = 8,
): Run[] {
  return state.runs.filter((run) => run.status === 'failed').slice(0, limit);
}

export function logsForRun(run: Run): LogEntry[] {
  return buildLogs(run.id, run.agentId, run.status === 'failed');
}
