import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { ProfilePhotoField } from './profile-photo-field'

function renderField(props: Partial<React.ComponentProps<typeof ProfilePhotoField>> = {}) {
  const onFile = jest.fn()
  const onRemove = jest.fn()
  renderWithTheme(
    <ProfilePhotoField
      inputId="photo"
      hintId="photo-hint"
      src={null}
      pendingFile={null}
      personName="나폴레옹"
      onFile={onFile}
      onRemove={onRemove}
      {...props}
    />,
  )
  return { onFile, onRemove }
}

function loadImage(image: HTMLElement, width: number, height: number) {
  Object.defineProperty(image, 'naturalWidth', { value: width, configurable: true })
  Object.defineProperty(image, 'naturalHeight', { value: height, configurable: true })
  fireEvent.load(image)
}

describe('ProfilePhotoField', () => {
  it('빈 칸 — 올리기 안내, 파일을 고르면 onFile', () => {
    const { onFile } = renderField()
    expect(screen.getByRole('button', { name: /프로필 사진 올리기/ })).toBeInTheDocument()
    expect(screen.getByText(/10MB 이하/)).toBeInTheDocument()
    const file = new File(['x'], 'face.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('프로필 사진 업로드'), { target: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('끌어 놓으면 onFile', () => {
    const { onFile } = renderField()
    const file = new File(['x'], 'face.png', { type: 'image/png' })
    const target = screen.getByRole('button', { name: /프로필 사진 올리기/ })
    fireEvent.dragEnter(target)
    expect(screen.getByText('여기에 놓아 올리기')).toBeInTheDocument()
    fireEvent.drop(target, { dataTransfer: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('찬 칸 — 상세·목록 두 원 미리보기, 크기·용량, 작은 사진 안내', () => {
    const pendingFile = new File([new Uint8Array(150 * 1024)], 'face.jpg', { type: 'image/jpeg' })
    renderField({ src: 'blob:face', pendingFile })
    expect(screen.getByText('새 사진 · 저장할 때 올라갑니다')).toBeInTheDocument()
    loadImage(screen.getByAltText('나폴레옹 프로필 사진'), 200, 260)
    expect(screen.getByText(/200×260px · 150KB/)).toBeInTheDocument()
    expect(screen.getByText(/흐릿할 수 있습니다/)).toBeInTheDocument()
    expect(screen.getByText('목록')).toBeInTheDocument()
  })

  it('가로로 긴 사진은 잘림 안내', () => {
    renderField({ src: '/uploads/persons/a.jpg' })
    loadImage(screen.getByAltText('나폴레옹 프로필 사진'), 1600, 900)
    expect(screen.getByText(/가운데 위쪽만 보입니다/)).toBeInTheDocument()
  })

  it('불러오기 실패는 알리고, 제거는 onRemove', () => {
    const { onRemove } = renderField({ src: '/uploads/persons/missing.jpg' })
    fireEvent.error(screen.getByAltText('나폴레옹 프로필 사진'))
    expect(screen.getByRole('alert')).toHaveTextContent('불러오지 못했습니다')
    fireEvent.click(screen.getByRole('button', { name: '프로필 사진 제거' }))
    expect(onRemove).toHaveBeenCalled()
  })
})
