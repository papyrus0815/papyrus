/**
 * 이벤트 내용 작성 섹션
 * FSD: widgets/event-form/ui
 */
import React, { useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import {
  FiAlertCircle,
  FiBook,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiFileText,
  FiGlobe,
  FiImage,
  FiMapPin,
  FiPlus,
  FiTag,
  FiUsers,
  FiX,
} from 'react-icons/fi'

import type { EventSection } from '@/features/event-create/model/use-event-basic-info'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventResponseDto } from '@/shared/api/events'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'
import { uploadImage } from '@/shared/api/upload'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'

import * as S from '../../../pages/events/create/event-create.styles'
// Explicitly import guide components
import {
  GuideIconButton,
  GuideTip,
  GuideTooltip,
  GuideTooltipClose,
  GuideTooltipContent,
  GuideTooltipHeader,
  GuideTooltipTitle,
  TipDescription,
  TipExample,
  TipNumber,
  TipTitle,
} from '../../../pages/events/create/event-create.styles'
import type { HistoricalEventCategory } from '../../../pages/events/create/events.types'
import { MENTION_TYPE_CONFIG } from '../../../pages/events/create/mention-system'
import { getImageUrl } from '../../../pages/events/utils/event-create.utils'
import { formatDateRange } from '../../../pages/events/utils/events.utils'

interface DetailsSectionProps {
  sections: EventSection[]
  setSections: (sections: EventSection[]) => void
  availablePersons: PersonResponseDto[]
  availableEvents: EventResponseDto[]
  availableCountries: CountryResponseDto[]
  availableHistoricalCountries: HistoricalCountryResponseDto[]
  availableMilitaryUnits: MilitaryUnit[]
  playClickSound: () => void
  // 사이드바용 추가 정보
  eventTitle?: string
  eventStartDate?: string
  eventEndDate?: string
  eventCategory?: HistoricalEventCategory | ''
  eventLocation?: string
  eventThumbnail?: string
}

export const DetailsSection: React.FC<DetailsSectionProps> = ({
  sections,
  setSections,
  availablePersons,
  availableEvents,
  availableCountries,
  availableHistoricalCountries,
  availableMilitaryUnits,
  playClickSound,
  eventTitle = '제목 없음',
  eventStartDate = '',
  eventEndDate = '',
  eventCategory = '',
  eventLocation = '',
  eventThumbnail = '',
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(
    sections[0]?.id || null,
  )
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // 외부 클릭 시 말풍선 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (isGuideOpen) {
        setIsGuideOpen(false)
      }
    }

    if (isGuideOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isGuideOpen])

  // 섹션 스크롤 핸들러
  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentSectionId(sectionId)
    }
  }

  // 통계 계산
  const calculateStats = () => {
    const totalWords = sections.reduce((sum, section) => {
      const textContent = section.content.replace(/<[^>]*>/g, '').trim()
      return (
        sum + textContent.split(/\s+/).filter((word) => word.length > 0).length
      )
    }, 0)

    const totalMentions = sections.reduce(
      (sum, section) => sum + section.mentions.length,
      0,
    )

    const estimatedReadTime = Math.max(1, Math.ceil(totalWords / 200)) // 분당 200단어

    return {
      totalWords,
      totalSections: sections.length,
      totalMentions,
      estimatedReadTime,
    }
  }

  const stats = calculateStats()

  // 카테고리 한글 이름
  const getCategoryName = (category: string) => {
    const map: Record<string, string> = {
      military: '전쟁/군사',
      political: '정치',
      diplomatic: '외교',
      economic: '경제',
      social: '사회',
      cultural: '문화',
      scientific: '과학',
      religious: '종교',
      other: '기타',
    }
    return map[category] || category
  }

  // 빠른 참조 데이터 (상위 5개)
  const topPersons = availablePersons.slice(0, 5)
  const topEvents = availableEvents.slice(0, 5)
  const topCountries = [
    ...availableCountries.map((c) => ({ ...c, isHistorical: false })),
    ...availableHistoricalCountries.map((c) => ({ ...c, isHistorical: true })),
  ].slice(0, 5)

  return (
    <S.ContentLayoutWrapper>
      {/* 에디터 컬럼 */}
      <S.EditorColumn>
        {/* 가이드 - 말풍선 형태 */}
        <div style={{ position: 'relative' }}>
          <GuideIconButton
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              playClickSound()
              setIsGuideOpen(!isGuideOpen)
            }}
            title="내용 작성 가이드"
          >
            <FiAlertCircle size={20} />
          </GuideIconButton>

          <GuideTooltip $visible={isGuideOpen}>
            <GuideTooltipHeader>
              <GuideTooltipTitle>
                <FiAlertCircle size={18} />
                내용 작성 가이드
              </GuideTooltipTitle>
              <GuideTooltipClose
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  playClickSound()
                  setIsGuideOpen(false)
                }}
              >
                <FiX size={14} />
              </GuideTooltipClose>
            </GuideTooltipHeader>

            <GuideTooltipContent>
              <GuideTip>
                <TipNumber>1</TipNumber>
                <div>
                  <TipTitle>멘션 (@)</TipTitle>
                  <TipDescription>
                    @를 입력하면 인물, 사건, 국가 등을 검색하여 태그할 수
                    있습니다.
                  </TipDescription>
                  <TipExample>예시: @처칠, @노르망디 상륙작전</TipExample>
                </div>
              </GuideTip>

              <GuideTip>
                <TipNumber>2</TipNumber>
                <div>
                  <TipTitle>엔티티 연결</TipTitle>
                  <TipDescription>
                    텍스트를 선택한 후 툴바의 링크 버튼을 클릭하거나 우클릭하여
                    특정 사건이나 인물과 연결할 수 있습니다.
                  </TipDescription>
                  <TipExample>
                    예시: "독일이 폴란드를 침공했다" 선택 → 우클릭 → "폴란드
                    침공" 사건 연결
                  </TipExample>
                </div>
              </GuideTip>
            </GuideTooltipContent>
          </GuideTooltip>
        </div>

        {sections.map((section, index) => (
          <React.Fragment key={section.id}>
            <div
              ref={(el) => {
                sectionRefs.current[section.id] = el
              }}
              style={{ position: 'relative', marginBottom: '16px' }}
            >
              {sections.length > 1 && (
                <S.RemoveSectionButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setSections(
                      sections.filter(
                        (sectionItem) => sectionItem.id !== section.id,
                      ),
                    )
                  }}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 10,
                  }}
                >
                  <FiX size={16} />
                </S.RemoveSectionButton>
              )}

              <RichTextEditor
                key={section.id}
                showTitle={true}
                title={section.title}
                onTitleChange={(newTitle) => {
                  setSections((prevSections) =>
                    prevSections.map((sectionItem) =>
                      sectionItem.id === section.id
                        ? { ...sectionItem, title: newTitle }
                        : sectionItem,
                    ),
                  )
                }}
                titlePlaceholder={`섹션 ${index + 1} 제목 (예: 배경, 전개, 여파 등)`}
                value={section.content}
                onChange={(newContent) => {
                  setSections((prevSections) =>
                    prevSections.map((sectionItem) =>
                      sectionItem.id === section.id
                        ? { ...sectionItem, content: newContent }
                        : sectionItem,
                    ),
                  )
                }}
                placeholder="내용을 작성하세요. @를 입력하면 인물, 사건, 국가 등을 검색할 수 있습니다."
                onImageUpload={async (file) => {
                  try {
                    const result = await uploadImage(file, 'events')
                    return result.url
                  } catch {
                    // 실패 시 데이터 URL 백업
                    return new Promise((resolve, reject) => {
                      const reader = new FileReader()
                      reader.onload = () => {
                        resolve(reader.result as string)
                      }
                      reader.onerror = reject
                      reader.readAsDataURL(file)
                    })
                  }
                }}
                mentionEntities={{
                  persons: availablePersons,
                  events: availableEvents,
                  countries: availableCountries,
                  historicalCountries: availableHistoricalCountries,
                  militaryUnits: availableMilitaryUnits,
                }}
              />

              {section.mentions.length > 0 && (
                <S.MentionsList>
                  {section.mentions.map((mention, idx) => (
                    <S.MentionTag key={idx} $type={mention.type}>
                      {React.createElement(
                        MENTION_TYPE_CONFIG[mention.type].icon,
                        { size: 12 },
                      )}
                      <span>{mention.name}</span>
                      <S.RemoveMentionButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setSections(
                            sections.map((sectionItem) =>
                              sectionItem.id === section.id
                                ? {
                                    ...sectionItem,
                                    mentions: sectionItem.mentions.filter(
                                      (_, mentionIndex) => mentionIndex !== idx,
                                    ),
                                  }
                                : sectionItem,
                            ),
                          )
                        }}
                      >
                        <FiX size={10} />
                      </S.RemoveMentionButton>
                    </S.MentionTag>
                  ))}
                </S.MentionsList>
              )}
            </div>

            {/* 섹션 사이의 작은 추가 버튼 */}
            {index < sections.length - 1 && (
              <S.AddSectionButtonCompact
                type="button"
                onClick={() => {
                  playClickSound()
                  const newSection = {
                    id: Date.now().toString(),
                    title: `Part ${sections.length + 1}`,
                    content: '',
                    mentions: [],
                  }
                  // 현재 섹션 바로 다음에 삽입
                  const updatedSections = [...sections]
                  updatedSections.splice(index + 1, 0, newSection)
                  setSections(updatedSections)
                }}
              >
                <FiPlus size={16} />
                섹션 삽입
              </S.AddSectionButtonCompact>
            )}
          </React.Fragment>
        ))}

        <S.AddSectionButton
          type="button"
          onClick={() => {
            playClickSound()
            setSections([
              ...sections,
              {
                id: Date.now().toString(),
                title: `Part ${sections.length + 1}`,
                content: '',
                mentions: [],
              },
            ])
          }}
        >
          <FiPlus size={16} />
          섹션 추가
        </S.AddSectionButton>
      </S.EditorColumn>

      {/* 사이드바 컬럼 */}
      <S.SidebarColumn>
        {/* 1. 사건 빠른 정보 */}
        <S.SidebarCard>
          <S.SidebarCardHeader>
            <FiFileText size={16} />
            <S.SidebarCardTitle>사건 정보</S.SidebarCardTitle>
          </S.SidebarCardHeader>
          <S.SidebarCardContent>
            {eventThumbnail && (
              <S.QuickInfoThumbnail
                src={getImageUrl(eventThumbnail)}
                alt={eventTitle}
              />
            )}
            <S.QuickInfoItem>
              <FiBook size={14} />
              <S.QuickInfoValue
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1e293b',
                }}
              >
                {eventTitle}
              </S.QuickInfoValue>
            </S.QuickInfoItem>
            {(eventStartDate || eventEndDate) && (
              <S.QuickInfoItem>
                <FiCalendar size={14} />
                <S.QuickInfoValue>
                  {formatDateRange(eventStartDate, eventEndDate)}
                </S.QuickInfoValue>
              </S.QuickInfoItem>
            )}
            {eventCategory && (
              <S.QuickInfoItem>
                <FiTag size={14} />
                <S.QuickInfoValue>
                  {getCategoryName(eventCategory)}
                </S.QuickInfoValue>
              </S.QuickInfoItem>
            )}
            {eventLocation && (
              <S.QuickInfoItem>
                <FiMapPin size={14} />
                <S.QuickInfoValue>{eventLocation}</S.QuickInfoValue>
              </S.QuickInfoItem>
            )}
          </S.SidebarCardContent>
        </S.SidebarCard>

        {/* 2. 목차 / 섹션 네비게이션 */}
        <S.SidebarCard>
          <S.SidebarCardHeader>
            <FiBook size={16} />
            <S.SidebarCardTitle>목차</S.SidebarCardTitle>
          </S.SidebarCardHeader>
          <S.TocList>
            {sections.map((section, index) => {
              const wordCount = section.content
                .replace(/<[^>]*>/g, '')
                .trim()
                .split(/\s+/)
                .filter((word) => word.length > 0).length

              return (
                <S.TocItem
                  key={section.id}
                  $active={currentSectionId === section.id}
                  onClick={() => {
                    playClickSound()
                    scrollToSection(section.id)
                  }}
                >
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                    {index + 1}.
                  </span>
                  <S.TocItemTitle>
                    {section.title || `섹션 ${index + 1}`}
                  </S.TocItemTitle>
                  <S.TocItemBadge>{wordCount}자</S.TocItemBadge>
                </S.TocItem>
              )
            })}
          </S.TocList>
        </S.SidebarCard>

        {/* 3. 작성 통계 */}
        <S.SidebarCard>
          <S.SidebarCardHeader>
            <FiFileText size={16} />
            <S.SidebarCardTitle>작성 통계</S.SidebarCardTitle>
          </S.SidebarCardHeader>
          <S.StatsGrid>
            <S.StatCard>
              <S.StatValue>{stats.totalWords}</S.StatValue>
              <S.StatLabel>단어</S.StatLabel>
            </S.StatCard>
            <S.StatCard>
              <S.StatValue>{stats.totalSections}</S.StatValue>
              <S.StatLabel>섹션</S.StatLabel>
            </S.StatCard>
            <S.StatCard>
              <S.StatValue>{stats.totalMentions}</S.StatValue>
              <S.StatLabel>멘션</S.StatLabel>
            </S.StatCard>
            <S.StatCard>
              <S.StatValue>{stats.estimatedReadTime}분</S.StatValue>
              <S.StatLabel>예상 독해</S.StatLabel>
            </S.StatCard>
          </S.StatsGrid>
        </S.SidebarCard>

        {/* 4. 빠른 참조: 관련 인물 */}
        {topPersons.length > 0 && (
          <S.SidebarCard>
            <S.SidebarCardHeader>
              <FiUsers size={16} />
              <S.SidebarCardTitle>관련 인물 (빠른 참조)</S.SidebarCardTitle>
            </S.SidebarCardHeader>
            <S.QuickRefList>
              {topPersons.map((person) => (
                <S.QuickRefItem
                  key={person.id}
                  onClick={() => {
                    playClickSound()
                    // TODO: 멘션 삽입 로직
                  }}
                >
                  <FiUsers size={12} />
                  <S.QuickRefName>{person.name}</S.QuickRefName>
                </S.QuickRefItem>
              ))}
            </S.QuickRefList>
          </S.SidebarCard>
        )}

        {/* 5. 빠른 참조: 관련 국가 */}
        {topCountries.length > 0 && (
          <S.SidebarCard>
            <S.SidebarCardHeader>
              <FiGlobe size={16} />
              <S.SidebarCardTitle>관련 국가 (빠른 참조)</S.SidebarCardTitle>
            </S.SidebarCardHeader>
            <S.QuickRefList>
              {topCountries.map((country) => (
                <S.QuickRefItem
                  key={country.id}
                  onClick={() => {
                    playClickSound()
                    // TODO: 멘션 삽입 로직
                  }}
                >
                  <FiGlobe size={12} />
                  <S.QuickRefName>
                    {country.name}
                    {country.isHistorical && (
                      <span style={{ fontSize: '10px', marginLeft: '4px' }}>
                        (역사)
                      </span>
                    )}
                  </S.QuickRefName>
                </S.QuickRefItem>
              ))}
            </S.QuickRefList>
          </S.SidebarCard>
        )}
      </S.SidebarColumn>
    </S.ContentLayoutWrapper>
  )
}
