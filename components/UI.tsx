import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle, TextInputProps,
} from 'react-native';
import { colors, spacing, radius, fonts } from '@/lib/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}
export function Subtitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}
export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}
export function Muted({ children, style, numberOfLines }: { children: React.ReactNode; style?: TextStyle; numberOfLines?: number }) {
  return <Text style={[styles.muted, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}
export function Button({ title, onPress, variant = 'primary', loading, disabled, small, style }: ButtonProps) {
  const variantStyle =
    variant === 'primary' ? styles.btnPrimary
    : variant === 'accent' ? styles.btnAccent
    : variant === 'secondary' ? styles.btnSecondary
    : variant === 'danger' ? styles.btnDanger
    : styles.btnGhost;
  const textVariant =
    variant === 'ghost' ? { color: colors.primary }
    : variant === 'secondary' ? { color: colors.text }
    : { color: colors.white };
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[styles.btnBase, variantStyle, small && styles.btnSmall, (disabled || loading) && { opacity: 0.5 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.btnText, textVariant, small && { fontSize: 13 }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Label style={{ marginBottom: spacing.xs }}>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: `${color}33` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
      <Muted style={{ textAlign: 'center' }}>{text}</Muted>
    </View>
  );
}

export function LoadingView() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder, marginVertical: spacing.md }} />;
}

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        active ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <Text style={{ color: active ? colors.white : colors.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  title: { fontSize: 24, fontFamily: fonts.display, color: colors.text },
  subtitle: { fontSize: 16, fontFamily: fonts.displayMedium, color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted },
  btnBase: {
    borderRadius: radius.full,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: spacing.md },
  btnPrimary: { backgroundColor: colors.primary },
  btnAccent: { backgroundColor: colors.accent },
  btnSecondary: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder },
  btnDanger: { backgroundColor: colors.danger },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { fontWeight: '700', fontSize: 15 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
});
