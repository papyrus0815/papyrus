/**
 * 이벤트 내용 작성 섹션
 * FSD: widgets/event-form/ui
 */
import React from 'react'

import { motion } from 'framer-motion'
import { FiAlertCircle, FiPlus, FiX } from 'react-icons/fi'

import type { EventSection } from '@/features/event-create/model/use-event-basic-info'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventResponseDto } from '@/shared/api/events'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'
import { uploadImage } from '@/shared/api/upload'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'

import { MENTION_TYPE_CONFIG } from '../../../pages/events/create/mention-system'
import * as S from '../../../pages/events/create/event-create.styles'

interface DetailsSectionProps {
  sections: EventSection[]
  setSections: (sections: EventSection[]) => void
  availablePersons: PersonResponseDto[]
  availableEvents: EventResponseDto[]
  availableCountries: CountryResponseDto[]
  availableHistoricalCountries: HistoricalCountryResponseDto[]
  availableMilitaryUnits: MilitaryUnit[]
  playClickSound: () => void
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
}) => {
  return (
    <S.FormSection
      as={motion.div}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {sections.map((section, index) => (
        <S.SectionCard key={section.id}>
          <S.SectionCardHeader>
            <S.SectionNumber>{index + 1}</S.SectionNumber>
            <S.SectionTitleInput
              type="text"
              placeholder="섹션 제목 (예: Part 1, 배경, 여파 등)"
              value={section.title}
              onChange={(changeEvent) => {
                setSections(
                  sections.map((sectionItem) =>
                    sectionItem.id === section.id
                      ? {
                          ...sectionItem,
                          title: changeEvent.target.value,
                        }
                      : sectionItem,
                  ),
                )
              }}
            />
            {sections.length > 1 && (
              <S.RemoveSectionButton
                type="button"
                onClick={() => {
                  playClickSound()
                  setSections(
                    sections.filter((sectionItem) => sectionItem.id !== section.id),
                  )
                }}
              >
                <FiX size={16} />
              </S.RemoveSectionButton>
            )}
          </S.SectionCardHeader>

          <S.RichTextEditorWrapper>
            <RichTextEditor
              value={section.content}
              onChange={(newContent) => {
                setSections(
                  sections.map((sectionItem) =>
                    sectionItem.id === section.id
                      ? { ...sectionItem, content: newContent }
                      : sectionItem,
                  ),
                )
              }}
              placeholder="내용을 작성하세요. @를 입력하면 인물, 사건, 국가 등을 검색할 수 있습니다."
              onImageUpload={async (file) => {
                try {
                  const result = await uploadImage(file)
                  return result.url
                } catch (error) {
                  console.error('이미지 업로드 실패:', error)
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
          </S.RichTextEditorWrapper>
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
        </S.SectionCard>
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

      <S.InfoBox>
        <FiAlertCircle size={16} />
        <div>
          <strong>멘션 사용법</strong>
          <p>
            내용 작성 중 @를 입력하면 모든 엔티티 타입(인물, 사건, 국가, 역사적
            국가, 도시, 군부대 등)을 검색하여 연결할 수 있습니다. 예: @처칠,
            @노르망디 상륙작전, @영국, @베를린
          </p>
        </div>
      </S.InfoBox>
    </S.FormSection>
  )
}
