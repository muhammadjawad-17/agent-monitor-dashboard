import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Card,
  EmptyState,
  LoadingState,
  formatDuration,
  formatRelative,
} from '../../src/components/ui';
import { useFleetStore } from '../../src/store/useFleetStore';
import { type Colors, radius, spacing, typography } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeContext';
import type { Run, RunStatus } from '../../src/types';

const STATUS_FILTERS: Array<'all' | RunStatus> = [
  'all',
  'failed',
  'running',
  'succeeded',
];

/** Built per palette rather than frozen at module scope, so it re-tints. */
const statusMeta = (
  c: Colors,
): Record<RunStatus, { color: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  succeeded: { color: c.healthy, icon: 'checkmark-circle' },
  failed: { color: c.failing, icon: 'close-circle' },
  running: { color: c.accent, icon: 'ellipsis-horizontal-circle' },
  cancelled: { color: c.idle, icon: 'remove-circle' },
});

export default function RunsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const STATUS_META = statusMeta(colors);

  const loading = useFleetStore((s) => s.loading);
  const runs = useFleetStore((s) => s.runs);
  const agents = useFleetStore((s) => s.agents);
  const [filter, setFilter] = useState<'all' | RunStatus>('all');

  const agentNames = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.id, a.name])),
    [agents],
  );

  const visible = useMemo(
    () => (filter === 'all' ? runs : runs.filter((r) => r.status === filter)),
    [runs, filter],
  );

  if (loading) return <LoadingState label="Loading run history" />;

  return (
    <View style={styles.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {STATUS_FILTERS.map((status) => {
          const active = filter === status;
          const tint =
            status === 'all' ? colors.accent : STATUS_META[status].color;
          const count =
            status === 'all'
              ? runs.length
              : runs.filter((r) => r.status === status).length;

          return (
            <Pressable
              key={status}
              onPress={() => setFilter(status)}
              style={[
                styles.filterChip,
                active
                  ? {
                      backgroundColor: `${tint}${colors.tintAlpha}`,
                      borderColor: tint,
                    }
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active ? { color: tint, fontWeight: '600' } : null,
                ]}
              >
                {status} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="pulse-outline"
            title="No runs to show"
            subtitle="Nothing matches this status filter right now."
          />
        }
        renderItem={({ item }) => (
          <RunRow run={item} agentName={agentNames[item.agentId] ?? item.agentId} />
        )}
      />
    </View>
  );
}

function RunRow({ run, agentName }: { run: Run; agentName: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = statusMeta(colors)[run.status];

  return (
    <Card style={styles.runCard} onPress={() => router.push(`/run/${run.id}`)}>
      <View style={styles.runHeader}>
        <Ionicons name={meta.icon} size={15} color={meta.color} />
        <Text style={styles.runAgent} numberOfLines={1}>
          {agentName}
        </Text>
        <Text style={styles.runId}>{run.id}</Text>
      </View>

      <Text style={styles.runSummary} numberOfLines={1}>
        {run.summary}
      </Text>

      {run.error && (
        <Text style={styles.runError} numberOfLines={2}>
          {run.error}
        </Text>
      )}

      <View style={styles.runFooter}>
        <Text style={styles.runMeta}>
          {run.status === 'running' ? 'running' : formatDuration(run.durationMs)}
        </Text>
        <Text style={styles.runDivider}>·</Text>
        <Text style={styles.runMeta}>
          {(run.inputTokens + run.outputTokens).toLocaleString()} tok
        </Text>
        <Text style={styles.runDivider}>·</Text>
        <Text style={styles.runMeta}>{run.toolCalls} tools</Text>
        <Text style={styles.runDivider}>·</Text>
        <Text style={styles.runMeta}>${run.costUsd.toFixed(3)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.runTime}>{formatRelative(run.startedAt)}</Text>
      </View>
    </Card>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  // Fixed chip height + centred row; padding alone let the ScrollView collapse
  // and clip the chip borders and letter descenders.
  filterScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.md },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  filterChip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterText: {
    ...typography.small,
    color: colors.textDim,
    textTransform: 'capitalize',
    lineHeight: 16,
    includeFontPadding: false,
  },

  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  runCard: { gap: 6 },
  runHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  runAgent: { ...typography.h3, color: colors.text, flex: 1 },
  runId: { ...typography.mono, color: colors.textMuted },
  runSummary: { ...typography.small, color: colors.textDim },
  runError: { ...typography.small, color: colors.failing, lineHeight: 17 },

  runFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  runMeta: { ...typography.tiny, color: colors.textDim },
  runDivider: { ...typography.tiny, color: colors.textMuted },
  runTime: { ...typography.tiny, color: colors.textMuted },
  });
