/**
 * 내 프로필 페이지 (전체 화면 레이아웃)
 * - 상단 히어로 배너: 아바타·닉네임·등급·핵심 지표
 * - 좌측: 등급 진행 / 뱃지
 * - 우측: 계정 설정 (닉네임·비밀번호 변경)
 */
import React, { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiAward,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiCopy,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiHash,
  FiLock,
  FiSearch,
  FiTrendingUp,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  BadgeList,
  GradeChip,
  GradeProgressCard,
  gamificationBadgesQueryOptions,
  gamificationSummaryQueryOptions,
} from '@/entities/gamification'
import {
  sessionApi,
  sessionKeys,
  sessionQueryOptions,
} from '@/entities/session'
import { usePersons } from '@/entities/person/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { queryClient } from '@/shared/queryClient'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

/** ISO 날짜 → "2024.03.11" */
function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** API 에러에서 사용자용 메시지를 최대한 뽑아낸다 */
function extractErrorMessage(err: unknown, fallback: string): string {
  const raw = (err as { message?: string })?.message
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.message) return String(parsed.message)
  } catch {
    // raw가 JSON이 아니면 그대로 사용
  }
  return raw.length < 100 ? raw : fallback
}

export default function ProfilePage() {
  return <ProfileContent />
}

function ProfileContent() {
  const navigate = useNavigate()
  const { data: account } = useQuery(sessionQueryOptions)
  const { data: summary } = useQuery(gamificationSummaryQueryOptions)
  const { data: badges } = useQuery(gamificationBadgesQueryOptions)

  const name = account?.displayName || account?.account || '게스트'
  const earned = (badges ?? []).filter((b) => b.earned)
  const gradeCode = summary?.gradeCode ?? account?.gradeCode

  const [thumbErrored, setThumbErrored] = useState(false)
  const showThumb = !!account?.heroThumbnail && !thumbErrored

  return (
    <Page>
      <PageHead>
        <div>
          <Title>내 프로필</Title>
          <Subtitle>계정 정보와 활동 내역을 한눈에 관리하세요.</Subtitle>
        </div>
        <LeaderboardBtn onClick={() => navigate(pathKeys.leaderboard())}>
          <TrophyChip>
            <FiAward size={15} />
          </TrophyChip>
          리더보드
          <Chevron>
            <FiChevronRight size={15} />
          </Chevron>
        </LeaderboardBtn>
      </PageHead>

      {/* 히어로 배너 */}
      <Hero>
        <HeroLeft>
          {showThumb ? (
            <AvatarImg
              src={account!.heroThumbnail!}
              alt=""
              onError={() => setThumbErrored(true)}
            />
          ) : (
            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
          )}
          <HeroIdentity>
            <HeroName>{name}</HeroName>
            <HeroSub>
              {account?.heroName && <HeroTag>{account.heroName}</HeroTag>}
              {gradeCode && <GradeChip gradeCode={gradeCode} />}
            </HeroSub>
          </HeroIdentity>
        </HeroLeft>

        <StatStrip>
          <Stat>
            <StatIcon>
              <FiTrendingUp size={16} />
            </StatIcon>
            <StatBody>
              <StatValue>
                {(summary?.totalPoints ?? account?.totalPoints ?? 0).toLocaleString()}
                <small>P</small>
              </StatValue>
              <StatLabel>누적 점수</StatLabel>
            </StatBody>
          </Stat>
          <Stat>
            <StatIcon>
              <FiAward size={16} />
            </StatIcon>
            <StatBody>
              <StatValue>
                {summary?.rank != null ? `${summary.rank.toLocaleString()}위` : '—'}
              </StatValue>
              <StatLabel>전체 순위</StatLabel>
            </StatBody>
          </Stat>
          <Stat>
            <StatIcon>
              <FiCalendar size={16} />
            </StatIcon>
            <StatBody>
              <StatValue>{formatDate(account?.createdAt)}</StatValue>
              <StatLabel>가입일</StatLabel>
            </StatBody>
          </Stat>
        </StatStrip>
      </Hero>

      {/* 본문 2단 그리드 */}
      <Grid>
        <Col>
          <Card>
            <CardTitle>등급 진행</CardTitle>
            {summary ? (
              <GradeProgressCard summary={summary} />
            ) : (
              <Muted>점수 정보를 불러오는 중...</Muted>
            )}
          </Card>

          <Card>
            <CardTitle>
              뱃지
              {badges && (
                <Count>
                  {earned.length}/{badges.length}
                </Count>
              )}
            </CardTitle>
            {badges ? (
              earned.length > 0 ? (
                <BadgeList badges={earned} />
              ) : (
                <Muted>콘텐츠를 등록하고 첫 뱃지를 획득해보세요!</Muted>
              )
            ) : (
              <Muted>뱃지 정보를 불러오는 중...</Muted>
            )}
          </Card>
        </Col>

        <Col>
          <Card>
            <CardTitle>대표 인물 (아바타)</CardTitle>
            <RepresentativePersonPicker
              currentPersonId={account?.representativePersonId ?? null}
            />
          </Card>

          <Card>
            <CardTitle>계정 설정</CardTitle>
            <DisplayNameForm currentName={account?.displayName ?? ''} />
            <ReadonlyRow>
              <ReadonlyLabel>
                <FiUser size={12} /> 로그인 ID
              </ReadonlyLabel>
              <ReadonlyValue>{account?.account ?? '—'}</ReadonlyValue>
              <ReadonlyTag>고정</ReadonlyTag>
            </ReadonlyRow>
            <AccountMeta>
              <MetaIcon>
                <FiHash size={13} />
              </MetaIcon>
              <CopyableId id={account?.id ?? ''} />
            </AccountMeta>
            <SectionDivider />
            <PasswordForm />
          </Card>
        </Col>
      </Grid>
    </Page>
  )
}

/** 계정 ID + 복사 버튼 */
function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    if (!id) return
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      notify.error('계정 ID 복사에 실패했습니다.')
    }
  }
  return (
    <IdText title={id}>
      <span>{id || '—'}</span>
      {id && (
        <CopyBtn onClick={handleCopy} aria-label="계정 ID 복사">
          {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
        </CopyBtn>
      )}
    </IdText>
  )
}

/** 대표 인물(아바타) 선택 — 본인이 등록한 Person 중 하나를 고른다 */
function RepresentativePersonPicker({
  currentPersonId,
}: {
  currentPersonId: string | null
}) {
  const { data: persons, isLoading } = usePersons()

  const [selected, setSelected] = useState<string | null>(currentPersonId)
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setSelected(currentPersonId)
  }, [currentPersonId])

  const filtered = (persons ?? []).filter((p) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const full = getPersonDisplayName(p).toLowerCase()
    // 표시명은 공백 조인("김 구")이므로 무공백 입력("김구")도 매칭되게 공백 제거 비교 병행
    return (
      full.includes(q) ||
      full.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
    )
  })

  const changed = selected !== currentPersonId
  const canSubmit = changed && !submitting

  const handleSave = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await sessionApi.setRepresentativePerson({ personId: selected })
      queryClient.invalidateQueries({ queryKey: sessionKeys.currentUser() })
      notify.success('대표 인물이 변경되었습니다.')
    } catch (err) {
      notify.error(extractErrorMessage(err, '대표 인물 변경에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PickerWrap>
      <InputWrap>
        <LeadIcon>
          <FiSearch size={15} />
        </LeadIcon>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="인물 검색"
        />
        {query && (
          <ToggleBtn
            type="button"
            onClick={() => setQuery('')}
            aria-label="검색 초기화"
          >
            <FiX size={15} />
          </ToggleBtn>
        )}
      </InputWrap>

      {isLoading ? (
        <Muted>인물 목록을 불러오는 중...</Muted>
      ) : (persons ?? []).length === 0 ? (
        <Muted>등록한 인물이 없습니다. 인물을 먼저 등록해주세요.</Muted>
      ) : (
        <PersonGrid>
          <PersonChip
            type="button"
            $active={selected === null}
            onClick={() => setSelected(null)}
          >
            <ChipAvatar $empty>
              <FiX size={16} />
            </ChipAvatar>
            <ChipName>지정 안 함</ChipName>
          </PersonChip>

          {filtered.map((p) => {
            const label = getPersonDisplayName(p) || p.name
            return (
              <PersonChip
                key={p.id}
                type="button"
                $active={selected === p.id}
                onClick={() => setSelected(p.id)}
                title={label}
              >
                {p.profileImageUrl ? (
                  <ChipAvatarImg src={p.profileImageUrl} alt="" />
                ) : (
                  <ChipAvatar>
                    <FiUser size={15} />
                  </ChipAvatar>
                )}
                <ChipName>{label}</ChipName>
              </PersonChip>
            )
          })}
          {filtered.length === 0 && <Muted>검색 결과가 없습니다.</Muted>}
        </PersonGrid>
      )}

      <SubmitBtn type="button" onClick={handleSave} disabled={!canSubmit}>
        {submitting ? '저장 중...' : '대표 인물 저장'}
      </SubmitBtn>
    </PickerWrap>
  )
}

/** 닉네임(표시명) 변경 폼 — 로그인 ID와 무관 */
function DisplayNameForm({ currentName }: { currentName: string }) {
  const [value, setValue] = useState(currentName)
  const [submitting, setSubmitting] = useState(false)

  // 외부에서 닉네임이 갱신되면 입력값 동기화
  useEffect(() => {
    setValue(currentName)
  }, [currentName])

  const trimmed = value.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < 2
  const changed = trimmed !== currentName
  const canSubmit =
    changed && trimmed.length >= 2 && trimmed.length <= 20 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await sessionApi.changeDisplayName({ displayName: trimmed })
      queryClient.invalidateQueries({ queryKey: sessionKeys.currentUser() })
      notify.success('닉네임이 변경되었습니다.')
    } catch (err) {
      notify.error(extractErrorMessage(err, '닉네임 변경에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field>
        <FieldLabel>닉네임</FieldLabel>
        <InputWrap $invalid={tooShort}>
          <LeadIcon>
            <FiEdit2 size={15} />
          </LeadIcon>
          <Input
            value={value}
            maxLength={20}
            onChange={(e) => setValue(e.target.value)}
            placeholder="2~20자"
          />
        </InputWrap>
        {tooShort ? (
          <Hint $error>최소 2자 이상이어야 합니다.</Hint>
        ) : (
          <Hint>헤더·리더보드에 표시되는 이름입니다. (로그인 ID와 무관)</Hint>
        )}
      </Field>
      <SubmitBtn type="submit" disabled={!canSubmit}>
        {submitting ? '저장 중...' : '닉네임 저장'}
      </SubmitBtn>
    </Form>
  )
}

/** 비밀번호 변경 폼 */
function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const tooShort = next.length > 0 && next.length < 8
  const mismatch = confirm.length > 0 && next !== confirm
  const canSubmit =
    !!current && next.length >= 8 && next === confirm && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await sessionApi.changePassword({
        currentPassword: current,
        newPassword: next,
      })
      notify.success('비밀번호가 변경되었습니다.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      notify.error(extractErrorMessage(err, '비밀번호 변경에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <FormHead>
        <FiLock size={13} /> 비밀번호 변경
      </FormHead>
      <PasswordField
        label="현재 비밀번호"
        value={current}
        autoComplete="current-password"
        onChange={setCurrent}
      />
      <PasswordField
        label="새 비밀번호"
        value={next}
        autoComplete="new-password"
        onChange={setNext}
        invalid={tooShort}
        hint={tooShort ? '최소 8자 이상이어야 합니다.' : '최소 8자'}
        hintError={tooShort}
      />
      <PasswordField
        label="새 비밀번호 확인"
        value={confirm}
        autoComplete="new-password"
        onChange={setConfirm}
        invalid={mismatch}
        hint={mismatch ? '새 비밀번호가 일치하지 않습니다.' : undefined}
        hintError={mismatch}
      />
      <SubmitBtn type="submit" disabled={!canSubmit}>
        {submitting ? '변경 중...' : '비밀번호 변경'}
      </SubmitBtn>
    </Form>
  )
}

/** 보기/숨기기 토글이 달린 비밀번호 입력 */
function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  invalid,
  hint,
  hintError,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  invalid?: boolean
  hint?: string
  hintError?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputWrap $invalid={!!invalid}>
        <LeadIcon>
          <FiLock size={15} />
        </LeadIcon>
        <Input
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <ToggleBtn
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? '숨기기' : '보기'}
        >
          {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
        </ToggleBtn>
      </InputWrap>
      {hint && <Hint $error={hintError}>{hint}</Hint>}
    </Field>
  )
}

/* ---------- styles ---------- */

const Page = styled.div`
  width: 100%;
  padding: calc(var(--header-height, 64px) + 24px) 32px 64px;
  display: flex;
  flex-direction: column;
  gap: 22px;

  @media (max-width: 640px) {
    padding: calc(var(--header-height, 64px) + 16px) 16px 48px;
  }
`

const PageHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
`

const Title = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`

const Subtitle = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PickerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const PersonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding: 2px;
`

const PersonChip = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 1.5px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary ?? '#6366f1' : 'transparent'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.colors.activeLight ?? 'rgba(99,102,241,0.1)'
      : theme.colors.background.secondary ?? 'rgba(0,0,0,0.02)'};
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
  }
`

const chipAvatarBase = css`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
`

const ChipAvatarImg = styled.img`
  ${chipAvatarBase}
  object-fit: cover;
`

const ChipAvatar = styled.div<{ $empty?: boolean }>`
  ${chipAvatarBase}
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: ${({ $empty, theme }) =>
    $empty
      ? theme.colors.text.tertiary ?? '#9ca3af'
      : theme.colors.primary ?? '#6366f1'};
`

const ChipName = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LeaderboardBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 7px 12px 7px 8px;
  border: 1px solid rgba(212, 160, 55, 0.35);
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(212, 160, 55, 0.16),
    rgba(212, 160, 55, 0.04) 70%
  );
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(212, 160, 55, 0.6);
    box-shadow: 0 8px 18px rgba(212, 160, 55, 0.25);
  }
  &:active {
    transform: translateY(0);
    box-shadow: 0 3px 8px rgba(212, 160, 55, 0.2);
  }
`

const TrophyChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  color: #fff;
  background: linear-gradient(135deg, #e8c259, #d4942e);
  box-shadow: 0 2px 7px rgba(212, 148, 46, 0.45);
  flex-shrink: 0;
`

const Chevron = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.15s ease;

  ${LeaderboardBtn}:hover & {
    transform: translateX(2px);
  }
`

const cardBase = css`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.06)'};
  border-radius: 16px;
`

const Hero = styled.section`
  ${cardBase}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 26px;
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${
      theme.colors.activeLight ?? 'rgba(99,102,241,0.10)'
    }, ${theme.colors.background.primary} 70%)`};

  @media (max-width: 860px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const HeroLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
`

const avatarBase = css`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
`

const AvatarImg = styled.img`
  ${avatarBase}
  object-fit: cover;
`

const AvatarFallback = styled.div`
  ${avatarBase}
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`

const HeroIdentity = styled.div`
  min-width: 0;
`

const HeroName = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeroSub = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
`

const HeroTag = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatStrip = styled.div`
  display: flex;
  gap: 10px;

  @media (max-width: 860px) {
    justify-content: space-between;
  }
  @media (max-width: 480px) {
    flex-direction: column;
  }
`

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.05)'};
  min-width: 124px;
`

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  color: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
  background: ${({ theme }) =>
    theme.colors.activeLight ?? 'rgba(99,102,241,0.1)'};
  flex-shrink: 0;
`

const StatBody = styled.div`
  display: flex;
  flex-direction: column;
`

const StatValue = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.2;

  small {
    font-size: 11px;
    font-weight: 700;
    margin-left: 1px;
    opacity: 0.7;
  }
`

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 20px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
`

const Card = styled.section`
  ${cardBase}
  padding: 20px 22px;
`

const CardTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const Count = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 8px 0;
`

const ReadonlyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
`

const ReadonlyLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
`

const ReadonlyValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`

const ReadonlyTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 2px 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary ?? 'rgba(0,0,0,0.04)'};
  flex-shrink: 0;
`

const AccountMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary ?? 'rgba(0,0,0,0.02)'};
`

const MetaIcon = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const IdText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 6px;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.07)'};
  margin: 20px 0;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const FormHead = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InputWrap = styled.div<{ $invalid?: boolean }>`
  display: flex;
  align-items: center;
  height: 42px;
  border-radius: 11px;
  border: 1.5px solid
    ${({ $invalid, theme }) =>
      $invalid ? '#ef4444' : theme.colors.border ?? 'rgba(0,0,0,0.12)'};
  background: ${({ theme }) => theme.colors.background.secondary ?? '#fff'};
  padding: 0 6px 0 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: ${({ $invalid, theme }) =>
      $invalid ? '#ef4444' : theme.colors.primary ?? '#6366f1'};
    box-shadow: 0 0 0 3px
      ${({ $invalid, theme }) =>
        $invalid
          ? 'rgba(239,68,68,0.15)'
          : theme.colors.activeLight ?? 'rgba(99,102,241,0.15)'};
  }
`

const LeadIcon = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 9px;
  flex-shrink: 0;
`

const Input = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 8px;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Hint = styled.span<{ $error?: boolean }>`
  font-size: 11px;
  color: ${({ $error, theme }) =>
    $error ? '#ef4444' : theme.colors.text.tertiary};
`

const SubmitBtn = styled.button`
  align-self: flex-start;
  padding: 10px 20px;
  border: none;
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.05s ease;

  &:hover:not(:disabled) {
    opacity: 0.92;
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`
