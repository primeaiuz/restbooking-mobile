import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ChatMessage } from '@/lib/types';
import { Screen, Title, Input, LoadingView, EmptyState } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function ChatThreadDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const threadId = Number(id);
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await api.getChatThreadMessages(threadId));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // No push/websocket transport for chat — poll while the thread is open so
  // the other side's replies appear without leaving and re-entering the screen.
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
      const msg = await api.sendChatThreadMessage(threadId, text);
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
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('chat.mThreadTitle')}</Title>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.lg }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<EmptyState text={t('chat.mEmpty')} />}
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
          <Input value={input} onChangeText={setInput} placeholder={t('chat.replyPlaceholder')} style={{ flex: 1, marginBottom: 0 }} onSubmitEditing={send} returnKeyType="send" />
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
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.cardBorder },
  senderName: { color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 2 },
  time: { color: colors.textFaint, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
