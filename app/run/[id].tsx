import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  Pill,
  formatDuration,
} from '../../src/components/ui';
import { logsForRun, useFleetStore } from '../../src/store/useFleetStore';
import { type Colors, radius, spacing, typography } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeContext';
import type { LogLevel } from '../../src/types';

/** Built per palette rather than frozen at module scope, so it re-tints. */
const levelColor = (c: Colors): Record<LogLevel, string> => ({
  debug: c.textMuted,
  info: c.accent,
  warn: c.degraded,
  error: c.failing,
});

export default function RunTraceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const LEVEL_COLOR = levelColor(colors);

  const run = useFleetStore((s) => s.runs.find((r) => r.id === id));
  const agent = useFleetStore((s) =>
    run ? s.agents.find((a) => a.id === run.agentId) : undefined,
  );

  const logs = useMemo(() => (run ? logsForRun(run) : []), [run]);

  if (!run) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Run not found"
        subtitle="This run may have aged out of the retention window."
      />
    );
  }

  const statusColor =
    run.status === 'failed'
      ? colors.failing
      : run.status === 'running'
        ? colors.accent
        : colors.healthy;

  const startTime = new Date(logs[0]?.timestamp ?? run.startedAt).getTime();

  return (
    <>
      <Stack.Screen options={{ title: run.id }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card accent={`${statusColor}55`} style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Ionicons
              name={
                run.status === 'failed'
                  ? 'close-circle'
                  : run.status === 'running'
                    ? 'ellipsis-horizontal-circle'
                    : 'checkmark-circle'
              }
              size={18}
              color={statusColor}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {run.status}
            </Text>
            <View style={{ flex: 1 }} />
            <Pill label={agent?.name ?? run.agentId} />
          </View>

          <Text style={styles.summary}>{run.summary}</Text>

          {run.error && (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={14} color={colors.failing} />
              <Text style={styles.errorText}>{run.error}</Text>
            </View>
          )}
        </Card>

        <View style={styles.statGrid}>
          <Stat
            label="Duration"
            value={
              run.status === 'running' ? '—' : formatDuration(run.durationMs)
            }
          />
          <Stat label="Tool calls" value={`${run.toolCalls}`} />
          <Stat label="Cost" value={`$${run.costUsd.toFixed(4)}`} />
          <Stat label="Input" value={run.inputTokens.toLocaleString()} />
          <Stat label="Output" value={run.outputTokens.toLocaleString()} />
          <Stat
            label="Total"
            value={(run.inputTokens + run.outputTokens).toLocaleString()}
          />
        </View>

        <Text style={styles.sectionTitle}>Trace</Text>
        <Card style={styles.traceCard}>
          {logs.map((entry, index) => {
            const offset = new Date(entry.timestamp).getTime() - startTime;
            return (
              <View
                key={entry.id}
                style={[
                  styles.logRow,
                  index === logs.length - 1 ? { borderBottomWidth: 0 } : null,
                ]}
              >
                <View style={styles.logGutter}>
                  <Text style={styles.logOffset}>
                    +{(offset / 1000).toFixed(2)}s
                  </Text>
                  <View
                    style={[
                      styles.levelBar,
                      { backgroundColor: LEVEL_COLOR[entry.level] },
                    ]}
                  />
                </View>

                <View style={styles.logBody}>
                  <View style={styles.logHeader}>
                    <Text
                      style={[
                        styles.logLevel,
                        { color: LEVEL_COLOR[entry.level] },
                      ]}
                    >
                      {entry.level.toUpperCase()}
                    </Text>
                    {entry.tool && (
                      <View style={styles.toolTag}>
                        <Ionicons
                          name="build-outline"
                          size={10}
                          color={colors.accent}
                        />
                        <Text style={styles.toolName}>{entry.tool}</Text>
                      </View>
                    )}
                    {entry.durationMs !== undefined && (
                      <Text style={styles.logDuration}>
                        {entry.durationMs}ms
                      </Text>
                    )}
                  </View>
                  <Text style={styles.logMessage}>{entry.message}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },

  headerCard: { gap: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: {
    ...typography.h3,
    textTransform: 'capitalize',
  },
  summary: { ...typography.body, color: colors.textDim, lineHeight: 20 },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: `${colors.failing}14`,
    borderWidth: 1,
    borderColor: `${colors.failing}44`,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.failing,
    flex: 1,
    lineHeight: 18,
  },

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
  statValue: { fontSize: 15, fontWeight: '700', color: colors.text },

  sectionTitle: { ...typography.h2, color: colors.text, marginTop: spacing.sm },

  traceCard: { padding: 0, overflow: 'hidden' },
  logRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logGutter: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  logOffset: {
    ...typography.mono,
    color: colors.textMuted,
    width: 48,
    textAlign: 'right',
  },
  levelBar: { width: 2, borderRadius: 1 },
  logBody: { flex: 1, gap: 3 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logLevel: { ...typography.tiny, fontWeight: '700' },
  toolTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.accent}1A`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  toolName: { ...typography.tiny, color: colors.accent, fontWeight: '600' },
  logDuration: { ...typography.tiny, color: colors.textMuted },
  logMessage: { ...typography.small, color: colors.textDim, lineHeight: 18 },
  });
