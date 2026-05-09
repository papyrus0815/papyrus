import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useNavigation, usePreventRemove } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { signedYear } from '@/lib/age-utils'
import { AppTextInput } from '@/components/app-text-input'
import { PickerModal, type PickerOption } from '@/components/picker-modal'
import { Radius, Spacing, Tokens } from '@/constants/theme'
import { errorMessage } from '@/lib/error'
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
  const navigation = useNavigation()
  const queryClient = useQueryClient()
  const editingId = params.id || null
  const isEdit = !!editingId

  const [form, setForm] = useState<PersonFormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [countries, setCountries] = useState<PickerOption[]>([])
  const [dynasties, setDynasties] = useState<PickerOption[]>([])
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [showDynastyPicker, setShowDynastyPicker] = useState(false)
  // dirty 비교 기준점 — state로 관리해 useMemo deps에 잡히도록
  const [baseline, setBaseline] = useState<PersonFormData>(EMPTY_FORM)
  const [baselineLoaded, setBaselineLoaded] = useState(!isEdit)
  // 키보드 next 체인용 refs
  const surnameRef = useRef<TextInput>(null)
  const regnalRef = useRef<TextInput>(null)
  const influenceRef = useRef<TextInput>(null)
  const biographyRef = useRef<TextInput>(null)

  // person/[id]와 동일 queryKey — 디테일 화면이 캐시에 push해두면 진입 즉시 prefill
  const detailQuery = useQuery({
    queryKey: ['persons', 'detail', editingId],
    queryFn: async () => {
      const res = await api.get<PersonDetail>(`/persons/${editingId}/detail`)
      return res.data
    },
    enabled: !!editingId,
  })

  // detail 도착 시 폼에 prefill (한 번만)
  useEffect(() => {
    if (!editingId || baselineLoaded) return
    if (!detailQuery.data) return
    const next = personToFormData(detailQuery.data)
    setForm(next)
    setBaseline(next)
    setBaselineLoaded(true)
    setLoading(false)
  }, [editingId, baselineLoaded, detailQuery.data])

  // 에러 처리: 편집 데이터를 못 불러오면 화면에 갇힘 → 안내 후 뒤로
  useEffect(() => {
    if (detailQuery.error && loading) {
      setLoading(false)
      Alert.alert(
        '불러오기 실패',
        errorMessage(detailQuery.error, '인물 정보를 불러올 수 없습니다.'),
        [{ text: '확인', onPress: () => router.back() }],
        { cancelable: false },
      )
    }
  }, [detailQuery.error, loading, router])

  const isDirty = useMemo(() => {
    if (!baselineLoaded) return false
    return JSON.stringify(form) !== JSON.stringify(baseline)
  }, [baselineLoaded, form, baseline])

  // 저장하지 않은 변경이 있으면 뒤로 가기·스와이프 가드
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert('이름 누락', '이름을 입력해주세요.')
      return
    }
    // 출생/사망 일자 정합성: 사망 < 출생 방지
    if (form.birth && form.death && !form.isAlive && !form.isDeathDateUnknown) {
      const b = signedYear(form.birth.era, form.birth.year)
      const d = signedYear(form.death.era, form.death.year)
      const sameYear = b === d
      const monthInvalid =
        sameYear &&
        form.birth.month != null &&
        form.death.month != null &&
        form.death.month < form.birth.month
      const dayInvalid =
        sameYear &&
        form.birth.month != null &&
        form.death.month != null &&
        form.birth.month === form.death.month &&
        form.birth.day != null &&
        form.death.day != null &&
        form.death.day < form.birth.day
      if (d < b || monthInvalid || dayInvalid) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        Alert.alert('일자 오류', '사망일이 출생일보다 빠를 수 없어요.')
        return
      }
    }
    setSaving(true)
    try {
      if (isEdit && editingId) {
        await updatePerson(editingId, form)
      } else {
        await createPerson(form)
      }
      // 저장 성공 → dirty=false로 만들어 usePreventRemove 가드 통과 + list 캐시 무효화
      setBaseline(form)
      void queryClient.invalidateQueries({ queryKey: ['persons'] })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('저장 실패', errorMessage(err, '인물 저장에 실패했어요.'))
    } finally {
      setSaving(false)
    }
  }, [form, isEdit, editingId, queryClient, router])

  const handleDelete = useCallback(() => {
    if (!editingId) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('인물 삭제', '정말 삭제하시겠어요? 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePerson(editingId)
            // 삭제 성공 — dirty 가드 우회 + list 캐시 무효화
            setBaseline(form)
            void queryClient.invalidateQueries({ queryKey: ['persons'] })
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
          } catch (err) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('삭제 실패', errorMessage(err, '삭제에 실패했어요.'))
          }
        },
      },
    ])
  }, [editingId, form, queryClient, router])

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={{ flex: 1, backgroundColor: Tokens.surface.canvas }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <Section title="이름">
            <AppTextInput
              label="이름 *"
              value={form.name}
              onChangeText={(t) => set('name', t)}
              placeholder="ex) 세종"
              returnKeyType="next"
              onSubmitEditing={() => surnameRef.current?.focus()}
              blurOnSubmit={false}
            />
            <AppTextInput
              ref={surnameRef}
              label="성"
              value={form.surname ?? ''}
              onChangeText={(t) => set('surname', t || null)}
              placeholder="ex) 이"
              returnKeyType="next"
              onSubmitEditing={() => regnalRef.current?.focus()}
              blurOnSubmit={false}
            />
            <AppTextInput
              ref={regnalRef}
              label="왕호 (재위명)"
              value={form.regnalName ?? ''}
              onChangeText={(t) => set('regnalName', t || null)}
              placeholder="ex) 세종대왕"
              returnKeyType="next"
              onSubmitEditing={() => influenceRef.current?.focus()}
              blurOnSubmit={false}
            />
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
            <AppTextInput
              ref={influenceRef}
              label="역사적 영향력 (0~100)"
              value={form.influence != null ? String(form.influence) : ''}
              onChangeText={(t) => {
                const n = parseInt(t, 10)
                set('influence', Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null)
              }}
              keyboardType="number-pad"
              placeholder="0~100"
              returnKeyType="next"
              onSubmitEditing={() => biographyRef.current?.focus()}
              blurOnSubmit={false}
            />
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
            <AppTextInput
              ref={biographyRef}
              value={form.biography ?? ''}
              onChangeText={(t) => set('biography', t || null)}
              multiline
              minHeight={120}
              placeholder="생애·업적 자유 서술"
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
  content: { padding: 12, paddingBottom: 32, gap: 12 },
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
  segBtnActive: { backgroundColor: Tokens.brand.primary },
  segText: { fontSize: 13, fontWeight: '600', color: Tokens.text.secondary },
  segTextActive: { color: Tokens.brand.onPrimary },
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
  saveBtn: { fontSize: 16, fontWeight: '700', color: Tokens.brand.primary, paddingHorizontal: 4 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: Tokens.state.negative.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Tokens.state.negative.fg,
  },
  deleteText: { fontSize: 14, fontWeight: '700', color: Tokens.state.negative.fg },
})
