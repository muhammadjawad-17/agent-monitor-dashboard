import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Card,
  ErrorState,
  LoadingState,
  Sparkline,
  StatusDot,
  formatCompact,
  formatRelative,
} from '../../src/components/ui';
import { useLiveTelemetry } from '../../src/hooks/useLiveTelemetry';
import {
  selectFleetMetrics,
  selectRecentFailures,
  useFleetStore,
} from '../../src/store/useFleetStore';
import {
  type Colors,
  healthColor,
  radius,
  spacing,
  typography,
} from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeContext';

export default function OverviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme, toggle } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const load = useFleetStore((s) => s.load);
  const refresh = useFleetStore((s) => s.refresh);
  const loading = useFleetStore((s) => s.loading);
  const error = useFleetStore((s) => s.error);
  const agents = useFleetStore((s) => s.agents);
  const runs = useFleetStore((s) => s.runs);
  const liveMode = useFleetStore((s) => s.liveMode);
  const toggleLiveMode = useFleetStore((s) => s.toggleLiveMode);

  // Derived off the raw slices rather than passed to useFleetStore directly:
  // these build new objects, so subscribing to them would fail Zustand's
  // reference check on every render and loop.
  const metrics = useMemo(() => selectFleetMetrics({ agents }), [agents]);
  const failures = useMemo(() => selectRecentFailures({ runs }, 4), [runs]);

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useLiveTelemetry();

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && agents.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const unhealthy = agents.filter(
    (a) => a.status === 'failing' || a.status === 'degraded',
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <Card style={styles.liveRow}>
        <View style={styles.liveLabel}>
          <StatusDot color={liveMode ? colors.healthy : colors.idle} />
          <Text style={styles.liveText} numberOfLines={1}>
            {liveMode ? 'Live telemetry streaming' : 'Live feed paused'}
          </Text>
        </View>

        <View style={styles.liveActions}>
          <Pressable
            onPress={toggle}
            style={styles.themeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${scheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Ionicons
              name={scheme === 'dark' ? 'sunny' : 'moon'}
              size={16}
              color={colors.textDim}
            />
          </Pressable>
          <Switch
            value={liveMode}
            onValueChange={toggleLiveMode}
            trackColor={{ true: colors.accentDim, false: colors.border }}
            thumbColor={liveMode ? colors.accent : colors.textMuted}
          />
        </View>
      </Card>

      <View style={styles.metricGrid}>
        <MetricTile
          label="Agents online"
          value={`${metrics.healthyAgents}/${metrics.totalAgents}`}
          icon="cube"
          tint={colors.accent}
        />
        <MetricTile
          label="Runs today"
          value={formatCompact(metrics.runsToday)}
          icon="pulse"
          tint={colors.healthy}
        />
        <MetricTile
          label="Error rate"
          value={`${(metrics.errorRate * 100).toFixed(1)}%`}
          icon="alert-circle"
          tint={metrics.errorRate > 0.05 ? colors.failing : colors.healthy}
        />
        <MetricTile
          label="Avg p95"
          value={`${(metrics.avgP95LatencyMs / 1000).toFixed(1)}s`}
          icon="timer"
          tint={colors.degraded}
        />
        <MetricTile
          label="Spend today"
          value={`$${metrics.costTodayUsd.toFixed(0)}`}
          icon="cash"
          tint={colors.accent}
        />
        <MetricTile
          label="Tokens today"
          value={formatCompact(metrics.tokensToday)}
          icon="layers"
          tint={colors.textDim}
        />
      </View>

      {unhealthy.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Needs attention</Text>
          {unhealthy.map((agent) => (
            <Card
              key={agent.id}
              accent={`${healthColor(agent.status, colors)}66`}
              style={styles.attentionCard}
              onPress={() => router.push(`/agent/${agent.id}`)}
            >
              <View style={styles.attentionHeader}>
                <StatusDot color={healthColor(agent.status, colors)} />
                <Text style={styles.attentionName}>{agent.name}</Text>
                <Text
                  style={[
                    styles.attentionStatus,
                    { color: healthColor(agent.status, colors) },
                  ]}
                >
                  {agent.status}
                </Text>
              </View>
              <Text style={styles.attentionDetail}>
                {agent.errorsToday} errors in {formatCompact(agent.runsToday)}{' '}
                runs · {(agent.successRate * 100).toFixed(1)}% success · p95{' '}
                {(agent.p95LatencyMs / 1000).toFixed(1)}s
              </Text>
              <Sparkline
                data={agent.throughput}
                width={280}
                height={36}
                color={healthColor(agent.status, colors)}
              />
            </Card>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Fleet throughput</Text>
      <Card>
        {agents
          .filter((a) => a.status !== 'idle')
          .map((agent, index, list) => (
            <View
              key={agent.id}
              style={[
                styles.throughputRow,
                index === list.length - 1 ? { borderBottomWidth: 0 } : null,
              ]}
            >
              <View style={styles.throughputLabel}>
                <StatusDot color={healthColor(agent.status, colors)} size={6} />
                <Text style={styles.throughputName} numberOfLines={1}>
                  {agent.name}
                </Text>
              </View>
              <Sparkline
                data={agent.throughput}
                width={110}
                height={26}
                color={healthColor(agent.status, colors)}
                filled={false}
              />
              <Text style={styles.throughputValue}>
                {formatCompact(agent.runsToday)}
              </Text>
            </View>
          ))}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent failures</Text>
        <Pressable onPress={() => router.push('/runs')}>
          <Text style={styles.link}>View all</Text>
        </Pressable>
      </View>

      {failures.length === 0 ? (
        <Card>
          <Text style={styles.emptyInline}>
            No failed runs in the current window.
          </Text>
        </Card>
      ) : (
        failures.map((run) => {
          const agent = agents.find((a) => a.id === run.agentId);
          return (
            <Card
              key={run.id}
              style={styles.failureCard}
              onPress={() => router.push(`/run/${run.id}`)}
            >
              <View style={styles.failureHeader}>
                <Ionicons
                  name="close-circle"
                  size={14}
                  color={colors.failing}
                />
                <Text style={styles.failureAgent}>
                  {agent?.name ?? run.agentId}
                </Text>
                <Text style={styles.failureTime}>
                  {formatRelative(run.startedAt)}
                </Text>
              </View>
              <Text style={styles.failureSummary} numberOfLines={1}>
                {run.summary}
              </Text>
              <Text style={styles.failureError} numberOfLines={2}>
                {run.error}
              </Text>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

function MetricTile({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, { backgroundColor: `${tint}22` }]}>
          <Ionicons name={icon} size={13} color={tint} />
        </View>
        <Text style={styles.metricLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },

  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  liveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  liveText: { ...typography.body, color: colors.text, fontWeight: '500', flexShrink: 1 },

  liveActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  themeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },

  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricTile: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { ...typography.tiny, color: colors.textDim, flex: 1 },
  metricValue: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.sm,
  },
  link: {
    ...typography.small,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  attentionCard: { gap: spacing.sm },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attentionName: { ...typography.h3, color: colors.text, flex: 1 },
  attentionStatus: {
    ...typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  attentionDetail: { ...typography.small, color: colors.textDim, lineHeight: 18 },

  throughputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  throughputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110,
  },
  throughputName: { ...typography.small, color: colors.textDim, flex: 1 },
  throughputValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    width: 46,
    textAlign: 'right',
  },

  failureCard: { gap: 6 },
  failureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  failureAgent: { ...typography.h3, color: colors.text, flex: 1 },
  failureTime: { ...typography.tiny, color: colors.textMuted },
  failureSummary: { ...typography.small, color: colors.textDim },
  failureError: {
    ...typography.small,
    color: colors.failing,
    lineHeight: 17,
  },
  emptyInline: {
    ...typography.small,
    color: colors.textDim,
    textAlign: 'center',
  },
  });
