import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Card,
  EmptyState,
  LoadingState,
  Pill,
  Sparkline,
  StatusDot,
  formatCompact,
  formatRelative,
} from '../../src/components/ui';
import {
  selectFilteredAgents,
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
import type { Agent } from '../../src/types';

const FILTERS = ['all', 'healthy', 'degraded', 'failing', 'idle'] as const;

export default function AgentsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const loading = useFleetStore((s) => s.loading);
  const allAgents = useFleetStore((s) => s.agents);
  const statusFilter = useFleetStore((s) => s.statusFilter);
  const setStatusFilter = useFleetStore((s) => s.setStatusFilter);
  const searchQuery = useFleetStore((s) => s.searchQuery);
  const setSearchQuery = useFleetStore((s) => s.setSearchQuery);

  // Filtering allocates a new array, so memoise rather than subscribing to it.
  const agents = React.useMemo(
    () => selectFilteredAgents({ agents: allAgents, statusFilter, searchQuery }),
    [allAgents, statusFilter, searchQuery],
  );

  if (loading) return <LoadingState />;

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search agents or models"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map((filter) => {
          const active = statusFilter === filter;
          const tint =
            filter === 'all' ? colors.accent : healthColor(filter, colors);
          return (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
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
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No agents match"
            subtitle="Try a different status filter or clear the search."
          />
        }
        renderItem={({ item }) => <AgentRow agent={item} />}
      />
    </View>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tint = healthColor(agent.status, colors);

  return (
    <Card style={styles.agentCard} onPress={() => router.push(`/agent/${agent.id}`)}>
      <View style={styles.agentHeader}>
        <StatusDot color={tint} />
        <Text style={styles.agentName} numberOfLines={1}>
          {agent.name}
        </Text>
        <Pill label={agent.environment} />
      </View>

      <Text style={styles.agentDesc} numberOfLines={2}>
        {agent.description}
      </Text>

      <View style={styles.agentMetrics}>
        <Metric
          label="Success"
          value={`${(agent.successRate * 100).toFixed(1)}%`}
          tint={agent.successRate < 0.9 ? colors.failing : colors.healthy}
        />
        <Metric label="Runs" value={formatCompact(agent.runsToday)} />
        <Metric
          label="p95"
          value={`${(agent.p95LatencyMs / 1000).toFixed(1)}s`}
        />
        <Metric label="Cost" value={`$${agent.costTodayUsd.toFixed(0)}`} />
      </View>

      <View style={styles.agentFooter}>
        <Sparkline data={agent.throughput} width={150} height={28} color={tint} />
        <View style={styles.agentFooterMeta}>
          <Text style={styles.agentModel}>{agent.model}</Text>
          <Text style={styles.agentTime}>{formatRelative(agent.lastRunAt)}</Text>
        </View>
      </View>
    </Card>
  );
}

function Metric({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tint ? { color: tint } : null]}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 42,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, ...typography.body },

  // The row is sized explicitly and its items centred. Previously it relied on
  // the chips' own padding, and with flexGrow:0 the ScrollView collapsed to a
  // height that cut off the chip borders and letter descenders.
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
    // Explicit line height keeps descenders (g, y) inside the chip.
    lineHeight: 16,
    includeFontPadding: false,
  },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  agentCard: { gap: spacing.sm },
  agentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  agentName: { ...typography.h3, color: colors.text, flex: 1 },
  agentDesc: { ...typography.small, color: colors.textDim, lineHeight: 18 },

  agentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  metric: { gap: 2 },
  metricLabel: { ...typography.tiny, color: colors.textMuted },
  metricValue: { ...typography.body, color: colors.text, fontWeight: '600' },

  agentFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  agentFooterMeta: { alignItems: 'flex-end', gap: 2 },
  agentModel: { ...typography.tiny, color: colors.textDim },
  agentTime: { ...typography.tiny, color: colors.textMuted },
  });
