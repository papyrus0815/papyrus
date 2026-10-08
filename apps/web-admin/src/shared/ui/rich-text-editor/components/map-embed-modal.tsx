/**
 * 본문에 구글 지도 넣기 — 장소 이름·구글 지도 주소·'지도 퍼가기' 코드·내 지도(My Maps) 링크를
 * 받아 미리 보여 주고, 확인하면 지도 블록(figure.map-embed)으로 끼운다.
 *
 * 캡처 대신 퍼가기를 쓰는 이유: 지도를 그림으로 박으면 고칠 수 없고 다크 모드에서 튀며, 진격로처럼
 * 그려야 하는 지도는 구글 '내 지도'에서 그린 뒤 같은 방식으로 붙이면 된다(API 키 불필요).
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import styled from 'styled-components'

import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { type MapEmbed, parseMapInput } from '@/shared/lib/map-embed'
import { Modal } from '@/shared/ui/modal'
import { ModalBody, ModalFooter } from '@/shared/ui/modal/modal.styles'

interface MapEmbedModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (embed: MapEmbed, caption: string) => void
}

export function MapEmbedModal({ isOpen, onClose, onInsert }: MapEmbedModalProps) {
  const [input, setInput] = useState('')
  const [caption, setCaption] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 다시 열면 빈 칸에서 시작
  useEffect(() => {
    if (!isOpen) {
      setInput('')
      setCaption('')
    }
  }, [isOpen])

  // 미리보기는 타이핑이 멈춘 뒤 — 글자마다 구글 지도를 다시 부르지 않게
  const settledInput = useDebouncedValue(input, 400, isOpen)
  const result = useMemo(() => (settledInput.trim() ? parseMapInput(settledInput) : null), [settledInput])
  const embed = result?.ok ? result.embed : null

  const insert = () => {
    if (!embed) return
    onInsert(embed, caption)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="지도 넣기"
      subtitle="장소 이름, 구글 지도 주소, '지도 퍼가기' 코드, 내 지도(My Maps) 링크 중 아무거나"
      maxWidth="680px"
      initialFocusRef={inputRef}
    >
      <Body>
        <Field>
          <Label htmlFor="map-embed-input">장소 · 주소 · 퍼가기 코드</Label>
          <Input
            id="map-embed-input"
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(changeEvent) => setInput(changeEvent.target.value)}
            placeholder="예: 사라예보 라틴 다리 / https://www.google.com/maps/place/… / <iframe src=…>"
          />
          {result && !result.ok && <ErrorText role="alert">{result.reason}</ErrorText>}
        </Field>

        <Preview aria-live="polite">
          {embed ? (
            <iframe
              key={embed.src}
              src={embed.src}
              title="지도 미리보기"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <PreviewEmpty>미리보기가 여기 나타납니다</PreviewEmpty>
          )}
        </Preview>

        <Field>
          <Label htmlFor="map-embed-caption">설명 (선택)</Label>
          <CaptionInput
            id="map-embed-caption"
            value={caption}
            maxLength={200}
            onChange={(changeEvent) => setCaption(changeEvent.target.value)}
            placeholder="예: 1914.6.28 암살 지점 — 라틴 다리"
          />
        </Field>

        <Help>
          <summary>진격로·점령지처럼 직접 그려야 할 때</summary>
          <ol>
            <li>
              구글 <strong>내 지도</strong>(google.com/mymaps)에서 새 지도를 만들고 지점·선·영역을 그립니다.
            </li>
            <li>
              공유에서 <strong>링크가 있는 모든 사용자</strong>에게 보기 권한을 준 뒤, 메뉴의{' '}
              <strong>내 사이트에 삽입</strong> 코드나 지도 주소를 복사합니다.
            </li>
            <li>여기에 붙여 넣으면 됩니다. 본문에 바로 붙여 넣어도 지도로 바뀝니다.</li>
          </ol>
        </Help>
      </Body>
      <ModalFooter>
        <SecondaryButton type="button" onClick={onClose}>
          취소
        </SecondaryButton>
        <PrimaryButton type="button" onClick={insert} disabled={!embed}>
          지도 넣기
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  )
}

const Body = styled(ModalBody)`
  gap: 14px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const inputBase = `
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
`

const Input = styled.textarea`
  ${inputBase}
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const CaptionInput = styled.input`
  ${inputBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.error};
`

const Preview = styled.div`
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1f2937' : '#e5e7eb')};
  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }
`

const PreviewEmpty = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Help = styled.details`
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  summary {
    cursor: pointer;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ol {
    margin: 8px 0 0;
    padding-left: 20px;
  }
`

const buttonBase = `
  height: 36px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
`

const SecondaryButton = styled.button`
  ${buttonBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PrimaryButton = styled.button`
  ${buttonBase}
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`
