import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useNavigation, usePreventRemove } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AppTextInput } from '@/components/app-text-input'
import { PickerModal, type PickerOption } from '@/components/picker-modal'
import { Radius, Spacing, Tokens } from '@/constants/theme'
import { errorMessage } from '@/lib/error'
import {
  createEvent,
  dateToIso,
  deleteEvent,
  EMPTY_EVENT_FORM,
  eventToFormData,
  fetchEventCategories,
  isoToDate,
  updateEvent,
  type EventFormData,
} from '@/lib/event-mutations'
import type { EventDetail } from '@/lib/dto'

type EraInput = 'AD' | 'BC'

export default function EventEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const navigation = useNavigation()
  const queryClient = useQueryClient()
  const editingId = params.id || null
  const isEdit = !!editingId

  const [form, setForm] = useState<EventFormData>(EMPTY_EVENT_FORM)
  const [keywordsInput, setKeywordsInput] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<PickerOption[]>([])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  // baseline은 form과 별개의 state로 관리 — ref 사용 시 useMemo deps에 안 잡혀 stale 비교 위험
  const [baseline, setBaseline] = useState<EventFormData>(EMPTY_EVENT_FORM)
  const [baselineKeywords, setBaselineKeywords] = useState('')
  // 수정 모드는 응답 도착 후만, 새 등록은 즉시 가드 활성화
  const [baselineLoaded, setBaselineLoaded] = useState(!isEdit)

  // 입력 ref — returnKey 체인
  const locationRef = useRef<TextInput>(null)
  const descriptionRef = useRef<TextInput>(null)
  const backgroundRef = useRef<TextInput>(null)
  const aftermathRef = useRef<TextInput>(null)

  // event/[id]와 동일 queryKey — detail에서 진입 시 이미 캐시된 데이터로 즉시 prefill
  const detailQuery = useQuery({
    queryKey: ['events', 'detail', editingId],
    queryFn: async () => {
      const res = await api.get<EventDetail>(`/events/${editingId}`)
      return res.data
    },
    enabled: !!editingId,
  })

  // detail 도착 시 폼에 prefill (한 번만)
  useEffect(() => {
    if (!editingId || baselineLoaded) return
    if (!detailQuery.data) return
    const next = eventToFormData(detailQuery.data)
    const kw = (next.keywords ?? []).join(', ')
    setForm(next)
    setKeywordsInput(kw)
    setBaseline(next)
    setBaselineKeywords(kw)
    setBaselineLoaded(true)
    setLoading(false)
  }, [editingId, baselineLoaded, detailQuery.data])

  // 에러 처리
  useEffect(() => {
    if (detailQuery.error && loading) {
      Alert.alert('불러오기 실패', errorMessage(detailQuery.error, '사건 정보를 불러올 수 없습니다.'))
      setLoading(false)
    }
  }, [detailQuery.error, loading])

  // 카테고리 옵션 로드
  useEffect(() => {
    let cancel = false
    fetchEventCategories()
      .then((cats) => {
        if (cancel) return
        setCategories(cats.map((c) => ({ id: c.id, label: c.name })))
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [])

  const isDirty = useMemo(() => {
    if (!baselineLoaded) return false
    return (
      JSON.stringify(form) !== JSON.stringify(baseline) ||
      keywordsInput !== baselineKeywords
    )
  }, [baselineLoaded, form, baseline, keywordsInput, baselineKeywords])

  // 저장하지 않은 변경 가드
  usePreventRemove(isDirty && !saving, ({ data }) => {
    Alert.alert('저장하지 않은 변경 사항', '나가면 변경 내용이 사라져요.', [
      { text: '머무르기', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ])
  })

  const set = useCallback(<K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // start/end 날짜 입력 — era/year/month/day → ISO
  const startInput = useMemo(
    () => isoToDate(form.startDate, form.startDatePrecision),
    [form.startDate, form.startDatePrecision],
  )
  const endInput = useMemo(
    () => isoToDate(form.endDate, form.endDatePrecision),
    [form.endDate, form.endDatePrecision],
  )

  const onChangeStart = useCallback(
    (v: { era: EraInput; year: number; month?: number; day?: number } | null) => {
      const { iso, precision } = dateToIso(v)
      setForm((prev) => ({ ...prev, startDate: iso, startDatePrecision: precision }))
    },
    [],
  )
  const onChangeEnd = useCallback(
    (v: { era: EraInput; year: number; month?: number; day?: number } | null) => {
      const { iso, precision } = dateToIso(v)
      setForm((prev) => ({ ...prev, endDate: iso, endDatePrecision: precision }))
    },
    [],
  )

  const handleSave = useCallback(async () => {
    if (!form.title?.trim()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert('제목 누락', '제목을 입력해주세요.')
      return
    }
    // 시작/종료일 정합성: ISO 문자열 직접 비교
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert('일자 오류', '종료일이 시작일보다 빠를 수 없어요.')
      return
    }
    setSaving(true)
    // keywords 입력 직렬화 — 콤마로 분리, 트림, 빈 토큰 제거
    const keywords = keywordsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    const payload: EventFormData = { ...form, keywords }
    try {
      if (isEdit && editingId) {
        await updateEvent(editingId, payload)
      } else {
        await createEvent(payload)
      }
      // 저장 성공 → dirty 가드 통과, list 캐시 무효화
      setBaseline(payload)
      setBaselineKeywords(keywordsInput)
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('저장 실패', errorMessage(err, '사건 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }, [form, keywordsInput, isEdit, editingId, queryClient, router])

  const handleDelete = useCallback(() => {
    if (!editingId) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('사건 삭제', '정말 삭제하시겠어요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(editingId)
            setBaseline(form)
            setBaselineKeywords(keywordsInput)
            void queryClient.invalidateQueries({ queryKey: ['events'] })
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
          } catch (err) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('삭제 실패', errorMessage(err, '삭제에 실패했습니다.'))
          }
        },
      },
    ])
  }, [editingId, form, keywordsInput, queryClient, router])

  const categoryOption = useMemo(
    () => categories.find((c) => c.id === form.categoryId),
    [categories, form.categoryId],
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
          title: isEdit ? '사건 수정' : '사건 등록',
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={{ flex: 1, backgroundColor: Tokens.surface.canvas }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <Section title="기본">
            <AppTextInput
              label="제목 *"
              value={form.title}
              onChangeText={(t) => set('title', t)}
              placeholder="ex) 임진왜란"
              returnKeyType="next"
              onSubmitEditing={() => locationRef.current?.focus()}
              blurOnSubmit={false}
            />
            <AppTextInput
              ref={locationRef}
              label="장소"
              value={form.location ?? ''}
              onChangeText={(t) => set('location', t || null)}
              placeholder="ex) 한양"
              returnKeyType="next"
              onSubmitEditing={() => descriptionRef.current?.focus()}
              blurOnSubmit={false}
            />
            <Field label="분류">
              <SelectButton
                value={categoryOption?.label ?? null}
                placeholder="선택"
                onPress={() => setShowCategoryPicker(true)}
              />
            </Field>
          </Section>

          <Section title="시작 일자">
            <DateRow
              value={
                startInput as { era: EraInput; year: number; month?: number; day?: number } | null
              }
              onChange={onChangeStart}
              placeholderYear="ex) 1592"
            />
          </Section>

          <Section title="종료 일자">
            <DateRow
              value={
                endInput as { era: EraInput; year: number; month?: number; day?: number } | null
              }
              onChange={onChangeEnd}
              placeholderYear="ex) 1598"
            />
          </Section>

          <Section title="개요">
            <AppTextInput
              ref={descriptionRef}
              value={form.description ?? ''}
              onChangeText={(t) => set('description', t || null)}
              multiline
              minHeight={120}
              placeholder="사건 개요 (HTML 가능)"
            />
          </Section>

          <Section title="배경">
            <AppTextInput
              ref={backgroundRef}
              value={form.background ?? ''}
              onChangeText={(t) => set('background', t || null)}
              multiline
              minHeight={100}
              placeholder="발생 배경"
            />
          </Section>

          <Section title="여파">
            <AppTextInput
              ref={aftermathRef}
              value={form.aftermath ?? ''}
              onChangeText={(t) => set('aftermath', t || null)}
              multiline
              minHeight={100}
              placeholder="결과·여파"
            />
          </Section>

          <Section title="키워드">
            <AppTextInput
              value={keywordsInput}
              onChangeText={setKeywordsInput}
              placeholder="콤마로 구분 (예: 전쟁, 조선, 일본)"
              autoCapitalize="none"
            />
          </Section>

          {isEdit && (
            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={Tokens.state.negative.fg} />
              <Text style={styles.deleteText}>사건 삭제</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={showCategoryPicker}
        title="분류 선택"
        options={categories}
        selectedId={form.categoryId ?? null}
        onSelect={(id) => set('categoryId', id)}
        onClose={() => setShowCategoryPicker(false)}
        searchPlaceholder="분류 검색"
      />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: Spacing.md }}>{children}</View>
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
    <View style={{ gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <SegmentedRow<EraInput>
          options={[
            { value: 'AD', label: 'AD' },
            { value: 'BC', label: 'BC' },
          ]}
          value={era}
          onChange={(v) => commit({ era: v, year, month, day })}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={year}
          onChangeText={(t) => commit({ era, year: t, month, day })}
          keyboardType="number-pad"
          placeholder={placeholderYear}
          placeholderTextColor={Tokens.text.soft}
          selectionColor={Tokens.brand.primary}
          cursorColor={Tokens.brand.primary}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={month}
          onChangeText={(t) => commit({ era, year, month: t, day })}
          keyboardType="number-pad"
          placeholder="월"
          placeholderTextColor={Tokens.text.soft}
          selectionColor={Tokens.brand.primary}
          cursorColor={Tokens.brand.primary}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={day}
          onChangeText={(t) => commit({ era, year, month, day: t })}
          keyboardType="number-pad"
          placeholder="일"
          placeholderTextColor={Tokens.text.soft}
          selectionColor={Tokens.brand.primary}
          cursorColor={Tokens.brand.primary}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 32, gap: Spacing.md },
  section: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Tokens.border.subtle,
    gap: Spacing.sm,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    minHeight: 44,
  },
  segRow: {
    flexDirection: 'row',
    backgroundColor: Tokens.surface.canvas,
    borderRadius: Radius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segBtnActive: { backgroundColor: Tokens.brand.primary },
  segText: { fontSize: 13, fontWeight: '600', color: Tokens.text.secondary },
  segTextActive: { color: Tokens.brand.onPrimary },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  selectText: { flex: 1, fontSize: 14, color: Tokens.text.primary },
  selectPlaceholder: { color: Tokens.text.soft },
  saveBtn: { fontSize: 16, fontWeight: '700', color: Tokens.brand.primary, paddingHorizontal: 4 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: Tokens.state.negative.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Tokens.state.negative.fg,
  },
  deleteText: { fontSize: 14, fontWeight: '700', color: Tokens.state.negative.fg },
})
