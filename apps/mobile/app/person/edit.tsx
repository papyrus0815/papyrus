import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@/lib/api'
import {
  createPerson,
  deletePerson,
  fetchCountries,
  fetchDynasties,
  personToFormData,
  updatePerson,
  type EraInput,
  type PersonFormData,
} from '@/lib/person-mutations'
import { PickerModal, type PickerOption } from '@/components/picker-modal'
import { Tokens } from '@/constants/theme'
import type { PersonDetail } from '@/lib/dto'

const EMPTY_FORM: PersonFormData = {
  name: '',
  surname: null,
  regnalName: null,
  gender: null,
  influence: null,
  biography: null,
  isAlive: false,
  isDeathDateUnknown: false,
  birth: null,
  death: null,
  countryId: null,
  dynastyId: null,
}

export default function PersonEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const editingId = params.id || null
  const isEdit = !!editingId

  const [form, setForm] = useState<PersonFormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [countries, setCountries] = useState<PickerOption[]>([])
  const [dynasties, setDynasties] = useState<PickerOption[]>([])
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [showDynastyPicker, setShowDynastyPicker] = useState(false)

  // 기존 인물 로드 (수정 모드)
  useEffect(() => {
    if (!editingId) return
    let cancel = false
    setLoading(true)
    api
      .get<PersonDetail>(`/persons/${editingId}/detail`)
      .then((res) => {
        if (cancel) return
        setForm(personToFormData(res.data))
      })
      .catch((err) => {
        if (cancel) return
        Alert.alert('불러오기 실패', err?.message ?? '인물 정보를 불러올 수 없습니다.')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [editingId])

  // 국가/가문 옵션 로드
  useEffect(() => {
    let cancel = false
    Promise.all([fetchCountries(), fetchDynasties()])
      .then(([c, d]) => {
        if (cancel) return
        setCountries(c.map((it) => ({ id: it.id, label: it.name, flagEmoji: it.flagEmoji })))
        setDynasties(d.map((it) => ({ id: it.id, label: it.name })))
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [])

  const set = useCallback(<K extends keyof PersonFormData>(key: K, value: PersonFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.name?.trim()) {
      Alert.alert('이름 누락', '이름은 필수입니다.')
      return
    }
    setSaving(true)
    try {
      if (isEdit && editingId) {
        await updatePerson(editingId, form)
      } else {
        await createPerson(form)
      }
      router.back()
    } catch (err: any) {
      Alert.alert('저장 실패', err?.response?.data?.message ?? err?.message ?? '인물 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [form, isEdit, editingId, router])

  const handleDelete = useCallback(() => {
    if (!editingId) return
    Alert.alert('인물 삭제', '정말 삭제하시겠어요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePerson(editingId)
            router.back()
          } catch (err: any) {
            Alert.alert('삭제 실패', err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.')
          }
        },
      },
    ])
  }, [editingId, router])

  const countryOption = useMemo(
    () => countries.find((c) => c.id === form.countryId),
    [countries, form.countryId],
  )
  const dynastyOption = useMemo(
    () => dynasties.find((d) => d.id === form.dynastyId),
    [dynasties, form.dynastyId],
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEdit ? '인물 수정' : '인물 등록',
          headerRight: () => (
            <Pressable onPress={handleSave} hitSlop={8} disabled={saving}>
              <Text style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
                {saving ? '저장 중…' : '저장'}
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: Tokens.surface.canvas }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Section title="이름">
            <Field label="이름 *">
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => set('name', t)}
                placeholder="ex) 세종"
                placeholderTextColor={Tokens.text.soft}
              />
            </Field>
            <Field label="성">
              <TextInput
                style={styles.input}
                value={form.surname ?? ''}
                onChangeText={(t) => set('surname', t || null)}
                placeholder="ex) 이"
                placeholderTextColor={Tokens.text.soft}
              />
            </Field>
            <Field label="왕호 (재위명)">
              <TextInput
                style={styles.input}
                value={form.regnalName ?? ''}
                onChangeText={(t) => set('regnalName', t || null)}
                placeholder="ex) 세종대왕"
                placeholderTextColor={Tokens.text.soft}
              />
            </Field>
          </Section>

          <Section title="속성">
            <Field label="성별">
              <SegmentedRow
                options={[
                  { value: null, label: '미상' },
                  { value: 'MALE', label: '남' },
                  { value: 'FEMALE', label: '여' },
                ]}
                value={form.gender ?? null}
                onChange={(v) => set('gender', v as PersonFormData['gender'])}
              />
            </Field>
            <Field label="역사적 영향력 (0~100)">
              <TextInput
                style={styles.input}
                value={form.influence != null ? String(form.influence) : ''}
                onChangeText={(t) => {
                  const n = parseInt(t, 10)
                  set('influence', Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null)
                }}
                keyboardType="number-pad"
                placeholder="0~100"
                placeholderTextColor={Tokens.text.soft}
              />
            </Field>
          </Section>

          <Section title="출생">
            <DateRow
              value={form.birth ?? null}
              onChange={(d) => set('birth', d)}
              placeholderYear="1397"
            />
          </Section>

          <Section title="사망">
            <Field label="">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Switch
                  value={!!form.isAlive}
                  onValueChange={(v) => {
                    set('isAlive', v)
                    if (v) set('death', null)
                  }}
                />
                <Text style={styles.toggleLabel}>생존 중</Text>
                <View style={{ flex: 1 }} />
                <Switch
                  value={!!form.isDeathDateUnknown}
                  onValueChange={(v) => set('isDeathDateUnknown', v)}
                  disabled={!!form.isAlive}
                />
                <Text style={[styles.toggleLabel, !!form.isAlive && { opacity: 0.5 }]}>일자 미상</Text>
              </View>
            </Field>
            {!form.isAlive && !form.isDeathDateUnknown && (
              <DateRow
                value={form.death ?? null}
                onChange={(d) => set('death', d)}
                placeholderYear="1450"
              />
            )}
          </Section>

          <Section title="소속">
            <Field label="국가">
              <SelectButton
                value={countryOption ? `${countryOption.flagEmoji ?? ''} ${countryOption.label}`.trim() : null}
                placeholder="선택"
                onPress={() => setShowCountryPicker(true)}
              />
            </Field>
            <Field label="가문/왕조">
              <SelectButton
                value={dynastyOption?.label ?? null}
                placeholder="선택"
                onPress={() => setShowDynastyPicker(true)}
              />
            </Field>
          </Section>

          <Section title="생애">
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.biography ?? ''}
              onChangeText={(t) => set('biography', t || null)}
              multiline
              placeholder="생애·업적 자유 서술"
              placeholderTextColor={Tokens.text.soft}
            />
          </Section>

          {isEdit && (
            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={Tokens.accent.red} />
              <Text style={styles.deleteText}>인물 삭제</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={showCountryPicker}
        title="국가 선택"
        options={countries}
        selectedId={form.countryId ?? null}
        onSelect={(id) => set('countryId', id)}
        onClose={() => setShowCountryPicker(false)}
        searchPlaceholder="국가 검색"
      />
      <PickerModal
        visible={showDynastyPicker}
        title="가문 선택"
        options={dynasties}
        selectedId={form.dynastyId ?? null}
        onSelect={(id) => set('dynastyId', id)}
        onClose={() => setShowDynastyPicker(false)}
        searchPlaceholder="가문 검색"
      />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {children}
    </View>
  )
}

function SegmentedRow<T>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.segRow}>
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <Pressable
            key={i}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.segBtn,
              active && styles.segBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{opt.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function SelectButton({
  value,
  placeholder,
  onPress,
}: {
  value: string | null
  placeholder: string
  onPress: () => void
}) {
  return (
    <Pressable style={styles.selectBtn} onPress={onPress}>
      <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
        {value ?? placeholder}
      </Text>
      <Ionicons name="chevron-down" size={16} color={Tokens.text.muted} />
    </Pressable>
  )
}

function DateRow({
  value,
  onChange,
  placeholderYear,
}: {
  value: { era: EraInput; year: number; month?: number; day?: number } | null
  onChange: (v: { era: EraInput; year: number; month?: number; day?: number } | null) => void
  placeholderYear: string
}) {
  const era = value?.era ?? 'AD'
  const year = value?.year != null ? String(value.year) : ''
  const month = value?.month != null ? String(value.month) : ''
  const day = value?.day != null ? String(value.day) : ''

  function commit(next: { era: EraInput; year: string; month: string; day: string }) {
    const y = parseInt(next.year, 10)
    if (!Number.isFinite(y)) {
      onChange(null)
      return
    }
    const m = parseInt(next.month, 10)
    const d = parseInt(next.day, 10)
    onChange({
      era: next.era,
      year: y,
      month: Number.isFinite(m) ? m : undefined,
      day: Number.isFinite(d) ? d : undefined,
    })
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SegmentedRow<EraInput>
          options={[
            { value: 'AD', label: 'AD' },
            { value: 'BC', label: 'BC' },
          ]}
          value={era}
          onChange={(v) => commit({ era: v, year, month, day })}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={year}
          onChangeText={(t) => commit({ era, year: t, month, day })}
          keyboardType="number-pad"
          placeholder={placeholderYear}
          placeholderTextColor={Tokens.text.soft}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={month}
          onChangeText={(t) => commit({ era, year, month: t, day })}
          keyboardType="number-pad"
          placeholder="월"
          placeholderTextColor={Tokens.text.soft}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={day}
          onChangeText={(t) => commit({ era, year, month, day: t })}
          keyboardType="number-pad"
          placeholder="일"
          placeholderTextColor={Tokens.text.soft}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 12, paddingBottom: 32, gap: 12 },
  section: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 12, color: Tokens.text.muted, fontWeight: '600' },
  input: {
    fontSize: 14,
    color: Tokens.text.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top', paddingVertical: 10 },
  toggleLabel: { fontSize: 13, color: Tokens.text.primary },
  segRow: {
    flexDirection: 'row',
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segBtnActive: { backgroundColor: Tokens.text.primary },
  segText: { fontSize: 13, fontWeight: '600', color: Tokens.text.secondary },
  segTextActive: { color: Tokens.text.inverse },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  selectText: { flex: 1, fontSize: 14, color: Tokens.text.primary },
  selectPlaceholder: { color: Tokens.text.soft },
  saveBtn: { fontSize: 16, fontWeight: '700', color: Tokens.accent.blue, paddingHorizontal: 4 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteText: { fontSize: 14, fontWeight: '700', color: Tokens.accent.red },
})
