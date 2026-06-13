import React, { forwardRef } from 'react';
import styled from 'styled-components';

export interface TextareaGroupProps {
  /** 텍스트 영역의 값 */
  value: string;
  /** 텍스트 변경 핸들러 */
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  /** 플레이스홀더 (옵션) */
  placeholder?: string;
  /** 기본 행 수 (옵션) */
  rows?: number;
  /** 추가 클래스 네임 (옵션) */
  className?: string;
}

/**
 * TextareaGroup 컴포넌트는 컨트롤드 컴포넌트로, 외부에서 value와 onChange를 전달받습니다.
 * forwardRef를 사용하여 ref 전달도 지원하며, React.memo로 최적화되어 있습니다.
 */
export const TextareaGroup = forwardRef<
  HTMLTextAreaElement,
  TextareaGroupProps
>(
  (
    {
      value,
      onChange,
      placeholder = '텍스트를 입력하세요...',
      rows = 5,
      className,
    },
    ref,
  ) => {
    return (
      <StyledTextarea
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
    );
  },
);

TextareaGroup.displayName = 'TextareaGroup';

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSize.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  resize: vertical;
  transition: border-color 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export default React.memo(TextareaGroup);
