import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { type Colors, radius, spacing, typography } from '../theme';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accent?: string;
}

export function Card({ children, onPress, style, accent }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  const content = (
    <View
      style={[
        styles.card,
        accent ? { borderColor: accent } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
    >
      {content}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Status pill and dot
// ---------------------------------------------------------------------------

export function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );
}

export function Pill({
  label,
  color,
  filled = false,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tint = color ?? colors.textDim;

  return (
    <View
      style={[
        styles.pill,
        {
          borderColor: filled ? 'transparent' : `${tint}66`,
          backgroundColor: filled ? `${tint}${colors.tintAlpha}` : 'transparent',
        },
      ]}
    >
      <Text style={[styles.pillText, { color: tint }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sparkline — hand-rolled SVG path, no chart library needed
// ---------------------------------------------------------------------------

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  color: colorProp,
  filled = true,
}: SparklineProps) {
  // Read the palette before the early return so hook order stays stable.
  const { colors } = useTheme();
  const color = colorProp ?? colors.accent;

  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((value, i) => ({
    x: i * step,
    // Leave 2px of padding top and bottom so the stroke is never clipped.
    y: height - 2 - ((value - min) / range) * (height - 4),
  }));

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const area = `${line} L${width},${height} L0,${height} Z`;
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {filled && <Path d={area} fill={`url(#${gradientId})`} />}
      <Path
        d={line}
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function LoadingState({ label = 'Loading telemetry' }: { label?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'search-outline',
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{subtitle}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.failing} />
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    // Light mode has almost no border contrast, so cards lift with a shadow.
    shadowColor: '#0B1220',
    shadowOpacity: colors.shadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: colors.shadowOpacity > 0 ? 2 : 0,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  pillText: {
    ...typography.tiny,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  stateTitle: {
    ...typography.h3,
    color: colors.text,
  },
  stateText: {
    ...typography.small,
    color: colors.textDim,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  });
