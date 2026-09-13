import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ChatMessage } from '@/lib/types';
import { Input, LoadingView, EmptyState } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export function SupportChatThread() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await api.getMyChatThread());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // The chat has no push/websocket transport, so poll while this screen is
  // focused — otherwise a reply from support only shows up after leaving and
  // re-entering the screen, which reads as "the app isn't loading messages".
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }, [load]),
  );

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await api.sendChatMessage(text);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing.lg }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<EmptyState text={t('chat.mSupportPlaceholder')} />}
        renderItem={({ item }) => {
          const mine = item.senderUserId === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              {!mine && <Text style={styles.senderName}>{item.senderName}</Text>}
              <Text style={{ color: mine ? colors.white : colors.text }}>{item.body}</Text>
              <Text style={styles.time}>{dayjs(item.createdAt).format('HH:mm')}</Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <Input value={input} onChangeText={setInput} placeholder={t('chat.mMessagePlaceholder')} style={{ flex: 1, marginBottom: 0 }} onSubmitEditing={send} returnKeyType="send" />
        <TouchableOpacity onPress={send} style={styles.sendBtn}>
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.cardBorder },
  senderName: { color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 2 },
  time: { color: colors.textFaint, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
