import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { ChatTurn } from '@/lib/types';
import { Screen, Title, Muted, Input } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

interface DisplayMessage extends ChatTurn {
  id: string;
  matchedVenueId?: number | null;
  matchedVenueName?: string | null;
}

export default function AssistantScreen() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { id: 'welcome', role: 'model', text: t('assistant.mWelcome') },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: DisplayMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const history: ChatTurn[] = messages.filter((m) => m.id !== 'welcome').map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await api.sendAiChatMessage({ history, message: text });
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`, role: 'model', text: res.reply,
          matchedVenueId: res.matchedVenueId, matchedVenueName: res.matchedVenueName,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'model', text: t('assistant.mUnavailable') }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <Screen>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Title>{t('assistant.title')}</Title>
        <Muted>{t('assistant.subtitle')}</Muted>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleModel]}>
              <Text style={{ color: item.role === 'user' ? colors.white : colors.text }}>{item.text}</Text>
              {item.matchedVenueId ? (
                <TouchableOpacity
                  onPress={() => router.push(`/(client)/catalog/${item.matchedVenueId}`)}
                  style={styles.venueLink}
                >
                  <Ionicons name="restaurant-outline" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, marginLeft: 6, fontWeight: '700', fontSize: 13 }}>
                    {t('assistant.mOpenVenue', { name: item.matchedVenueName })}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />
        {sending && <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.sm }} />}
        <View style={styles.inputRow}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder={t('assistant.placeholder')}
            style={{ flex: 1, marginBottom: 0 }}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={send} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleModel: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.cardBorder },
  venueLink: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
