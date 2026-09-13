import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import * as api from '@/lib/api';
import type { CreateVenueRequest } from '@/lib/api';
import type { VenueType } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

const VALID_TYPES: VenueType[] = ['RESTAURANT', 'TEAHOUSE', 'CAFE'];
// No bulk-create endpoint on the backend — this loops the existing single-venue
// POST /aggregator/venues call once per CSV row. Fine for the tens-of-rows scale
// a chain onboarding a batch of venues would realistically paste in at once.
const CSV_HEADER = 'name,type,city,district,cuisine,phone,address';

interface ParsedRow {
  line: number;
  raw: string;
  req?: CreateVenueRequest;
  error?: string;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const startIdx = lines[0]?.toLowerCase().replace(/\s/g, '') === CSV_HEADER.replace(/,/g, ',') ? 1 : 0;
  const rows: ParsedRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',').map((c) => c.trim());
    const [name, type, city, district, cuisine, phone, address] = cols;
    if (!name || !type || !city) {
      rows.push({ line: i + 1, raw: line, error: i18n.t('common.mCsvRequiredFields') });
      continue;
    }
    const upperType = type.toUpperCase() as VenueType;
    if (!VALID_TYPES.includes(upperType)) {
      rows.push({ line: i + 1, raw: line, error: i18n.t('common.mCsvInvalidType', { types: VALID_TYPES.join(', ') }) });
      continue;
    }
    rows.push({
      line: i + 1,
      raw: line,
      req: { name, type: upperType, city, district: district || undefined, cuisine: cuisine || undefined, phone: phone || undefined, address: address || undefined },
    });
  }
  return rows;
}

export default function ImportVenuesScreen() {
  const { t } = useTranslation();
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const parsed = useMemo(() => parseCsv(csv), [csv]);
  const validRows = parsed.filter((r) => r.req);
  const invalidRows = parsed.filter((r) => r.error);

  async function runImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    let ok = 0;
    const failures: string[] = [];
    for (const row of validRows) {
      try {
        await api.createChainVenue(row.req!);
        ok += 1;
      } catch (e) {
        failures.push(`${t('mImportVenues.mLine')} ${row.line} (${row.req!.name}): ${api.extractErrorMessage(e)}`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setImporting(false);
    Alert.alert(
      t('mImportVenues.mResultTitle'),
      t('mImportVenues.mResultMessage', { ok, total: validRows.length }) + (failures.length ? `\n\n${failures.join('\n')}` : ''),
      [{ text: t('common.ok'), onPress: () => { if (ok > 0) router.back(); } }],
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Title>{t('mImportVenues.title')}</Title>
        </View>

        <Muted style={{ marginBottom: spacing.md }}>{t('mImportVenues.hint')}</Muted>
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.textFaint, fontSize: 12, fontFamily: 'monospace' }}>{CSV_HEADER}</Text>
          <Text style={{ color: colors.textFaint, fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>
            Chinar,RESTAURANT,Ташкент,Юнусабад,Узбекская,+998901234567,ул. Амира Темура 1
          </Text>
        </Card>

        <Input
          value={csv}
          onChangeText={setCsv}
          multiline
          style={{ minHeight: 160, textAlignVertical: 'top', fontFamily: 'monospace', fontSize: 13 }}
          placeholder={CSV_HEADER}
        />

        {csv.trim().length > 0 && (
          <Muted style={{ marginBottom: spacing.md }}>
            {t('mImportVenues.mParsed', { valid: validRows.length, invalid: invalidRows.length })}
          </Muted>
        )}
        {invalidRows.length > 0 && (
          <Card style={{ marginBottom: spacing.lg, borderColor: colors.danger }}>
            {invalidRows.map((r) => (
              <Text key={r.line} style={{ color: colors.danger, fontSize: 12, marginBottom: 4 }}>
                {t('mImportVenues.mLine')} {r.line}: {r.error}
              </Text>
            ))}
          </Card>
        )}

        <Button
          title={progress ? `${t('mImportVenues.mImporting')} ${progress.done}/${progress.total}` : t('mImportVenues.mImportButton', { count: validRows.length })}
          onPress={runImport}
          loading={importing}
          disabled={validRows.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}
