import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, LoadingState, Pill, formatRelative } from '../../src/components/ui';
import { useFleetStore } from '../../src/store/useFleetStore';
import { colors, radius, spacing, typography } from '../../src/theme';
import type { AlertRule } from '../../src/types';

const CHANNEL_META: Record<
  AlertRule['channel'],
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  slack: { icon: 'chatbubbles-outline', label: 'Slack', color: colors.accent },
  email: { icon: 'mail-outline', label: 'Email', color: colors.textDim },
  pagerduty: {
    icon: 'alert-circle-outline',
    label: 'PagerDuty',
    color: colors.failing,
  },
};

export default function AlertsScreen() {
  const loading = useFleetStore((s) => s.loading);
  const rules = useFleetStore((s) => s.alertRules);
  const toggleRule = useFleetStore((s) => s.toggleAlertRule);

  if (loading) return <LoadingState label="Loading alert rules" />;

  const active = rules.filter((r) => r.enabled).length;
  const firedThisWeek = rules.reduce((sum, r) => sum + r.triggeredThisWeek, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {active}
            <Text style={styles.summaryTotal}>/{rules.length}</Text>
          </Text>
          <Text style={styles.summaryLabel}>Rules armed</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text
            style={[
              styles.summaryValue,
              firedThisWeek > 10 ? { color: colors.degraded } : null,
            ]}
          >
            {firedThisWeek}
          </Text>
          <Text style={styles.summaryLabel}>Fired this week</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Rules</Text>

      {rules.map((rule) => {
        const channel = CHANNEL_META[rule.channel];
        return (
          <Card key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={styles.ruleTitleWrap}>
                <Text
                  style={[
                    styles.ruleName,
                    !rule.enabled ? { color: colors.textMuted } : null,
                  ]}
                >
                  {rule.name}
                </Text>
                <Text style={styles.ruleCondition}>{rule.condition}</Text>
              </View>
              <Switch
                value={rule.enabled}
                onValueChange={() => toggleRule(rule.id)}
                trackColor={{ true: colors.accentDim, false: colors.border }}
                thumbColor={rule.enabled ? colors.accent : colors.textMuted}
              />
            </View>

            <View style={styles.ruleFooter}>
              <View style={styles.channelWrap}>
                <Ionicons name={channel.icon} size={13} color={channel.color} />
                <Text style={[styles.channelText, { color: channel.color }]}>
                  {channel.label}
                </Text>
              </View>

              <Pill
                label={`${rule.triggeredThisWeek} this week`}
                color={
                  rule.triggeredThisWeek > 5 ? colors.degraded : colors.textDim
                }
              />

              <View style={{ flex: 1 }} />

              <Text style={styles.ruleTime}>
                {rule.lastTriggeredAt
                  ? `Last ${formatRelative(rule.lastTriggeredAt)}`
                  : 'Never fired'}
              </Text>
            </View>
          </Card>
        );
      })}

      <Card style={styles.noteCard}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={colors.textDim}
        />
        <Text style={styles.noteText}>
          Rules evaluate against the rolling telemetry window. Toggling one here
          takes effect on the next evaluation cycle.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },

  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summaryCard: { flex: 1, alignItems: 'center', gap: spacing.xs },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
  },
  summaryTotal: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
  summaryLabel: { ...typography.tiny, color: colors.textDim },

  sectionTitle: { ...typography.h2, color: colors.text, marginTop: spacing.sm },

  ruleCard: { gap: spacing.md },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  ruleTitleWrap: { flex: 1, gap: 3 },
  ruleName: { ...typography.h3, color: colors.text },
  ruleCondition: { ...typography.small, color: colors.textDim, lineHeight: 18 },

  ruleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  channelWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  channelText: { ...typography.tiny, fontWeight: '600' },
  ruleTime: { ...typography.tiny, color: colors.textMuted },

  noteCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
  noteText: {
    ...typography.small,
    color: colors.textDim,
    flex: 1,
    lineHeight: 18,
  },
});
