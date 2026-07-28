import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  Pill,
  Sparkline,
  StatusDot,
  formatCompact,
  formatDuration,
  formatRelative,
} from '../../src/components/ui';
import {
  selectRunsForAgent,
  useFleetStore,
} from '../../src/store/useFleetStore';
import { colors, healthColor, radius, spacing, typography } from '../../src/theme';

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const agent = useFleetStore((s) => s.agents.find((a) => a.id === id));
  const runs = useFleetStore((s) => (id ? selectRunsForAgent(s, id) : []));

  if (!agent) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Agent not found"
        subtitle="This agent may have been removed from the fleet."
      />
    );
  }

  const tint = healthColor(agent.status);
  const failed = runs.filter((r) => r.status === 'failed').length;

  return (
    <>
      <Stack.Screen options={{ title: agent.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <Card accent={`${tint}55`} style={styles.headerCard}>
          <View style={styles.headerTop}>
            <StatusDot color={tint} size={10} />
            <Text style={[styles.statusText, { color: tint }]}>
              {agent.status}
            </Text>
            <View style={{ flex: 1 }} />
            <Pill label={agent.environment} />
          </View>

          <Text style={styles.description}>{agent.description}</Text>

          <View style={styles.modelRow}>
            <Ionicons name="hardware-chip-outline" size={13} color={colors.textDim} />
            <Text style={styles.modelText}>{agent.model}</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.lastRun}>
              Last run {formatRelative(agent.lastRunAt)}
            </Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Throughput, last 24 hours</Text>
        <Card>
          <Sparkline
            data={agent.throughput}
            width={300}
            height={80}
            color={tint}
          />
          <View style={styles.chartAxis}>
            <Text style={styles.axisLabel}>24h ago</Text>
            <Text style={styles.axisLabel}>now</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Health</Text>
        <View style={styles.statGrid}>
          <Stat
            label="Success rate"
            value={`${(agent.successRate * 100).toFixed(1)}%`}
            tint={agent.successRate < 0.9 ? colors.failing : colors.healthy}
          />
          <Stat
            label="p95 latency"
            value={`${(agent.p95LatencyMs / 1000).toFixed(1)}s`}
            tint={agent.p95LatencyMs > 15000 ? colors.degraded : colors.text}
          />
          <Stat label="Runs today" value={formatCompact(agent.runsToday)} />
          <Stat
            label="Errors today"
            value={`${agent.errorsToday}`}
            tint={agent.errorsToday > 100 ? colors.failing : colors.text}
          />
          <Stat label="Tokens" value={formatCompact(agent.tokensToday)} />
          <Stat label="Cost today" value={`$${agent.costTodayUsd.toFixed(2)}`} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent runs</Text>
          <Text style={styles.sectionMeta}>
            {failed} failed of {runs.length}
          </Text>
        </View>

        {runs.length === 0 ? (
          <Card>
            <Text style={styles.emptyInline}>
              This agent has not run in the current window.
            </Text>
          </Card>
        ) : (
          runs.map((run) => (
            <Card
              key={run.id}
              style={styles.runCard}
              onPress={() => router.push(`/run/${run.id}`)}
            >
              <View style={styles.runHeader}>
                <Ionicons
                  name={
                    run.status === 'failed'
                      ? 'close-circle'
                      : run.status === 'running'
                        ? 'ellipsis-horizontal-circle'
                        : 'checkmark-circle'
                  }
                  size={14}
                  color={
                    run.status === 'failed'
                      ? colors.failing
                      : run.status === 'running'
                        ? colors.accent
                        : colors.healthy
                  }
                />
                <Text style={styles.runSummary} numberOfLines={1}>
                  {run.summary}
                </Text>
                <Text style={styles.runTime}>
                  {formatRelative(run.startedAt)}
                </Text>
              </View>
              <Text style={styles.runMeta}>
                {run.status === 'running'
                  ? 'in flight'
                  : formatDuration(run.durationMs)}{' '}
                · {(run.inputTokens + run.outputTokens).toLocaleString()} tokens ·{' '}
                {run.toolCalls} tool calls · ${run.costUsd.toFixed(3)}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tint ? { color: tint } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.md },

  headerCard: { gap: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: {
    ...typography.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: { ...typography.body, color: colors.textDim, lineHeight: 20 },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modelText: { ...typography.small, color: colors.textDim },
  lastRun: { ...typography.tiny, color: colors.textMuted },

  sectionTitle: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionMeta: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  chartAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  axisLabel: { ...typography.tiny, color: colors.textMuted },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statTile: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statLabel: { ...typography.tiny, color: colors.textMuted },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.text },

  runCard: { gap: 5 },
  runHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  runSummary: { ...typography.small, color: colors.text, flex: 1, fontWeight: '500' },
  runTime: { ...typography.tiny, color: colors.textMuted },
  runMeta: { ...typography.tiny, color: colors.textDim, lineHeight: 16 },

  emptyInline: {
    ...typography.small,
    color: colors.textDim,
    textAlign: 'center',
  },
});
