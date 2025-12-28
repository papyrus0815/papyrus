import styled from 'styled-components'

/** 버튼의 기본 스타일. 모든 버튼 변형(variant)에 적용. */
const BaseButton = styled.button`
  padding: 10px 18px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

/** 기본 버튼 */
export const DefaultButton = styled(BaseButton)`
  background-color: #fff;
  color: #212529;

  &:hover {
    background-color: #f8f9fa;
  }
`

/** 주요 액션 버튼 */
export const PrimaryButton = styled(BaseButton)`
  background-color: #007bff;
  color: white;
  border-color: #007bff;

  &:hover {
    background-color: #0056b3;
    border-color: #0056b3;
  }
`
