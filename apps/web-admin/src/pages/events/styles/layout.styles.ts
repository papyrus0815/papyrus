/**
 * Layout Styled Components
 * 페이지 레이아웃 관련 스타일
 */
import styled from 'styled-components'

export const PageScene = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height));
  padding-top: 16px;
  padding-bottom: 16px;
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding-top: 16px;
    padding-bottom: 16px;
  }
`

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 0 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`

export const PageTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

export const PageTopTitle = styled.div`
  h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: #0f172a;
  }

  p {
    margin: 6px 0 0;
    font-size: 14px;
    color: #64748b;
  }
`

export const CreateEventButton = styled.button`
  border: 1.5px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  padding: 12px 20px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.12),
    rgba(168, 85, 247, 0.08)
  );
  color: #4f46e5;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.18),
      rgba(168, 85, 247, 0.12)
    );
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.2);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`

export const TopFilterBar = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  background: #ffffff;
  border: 1.5px solid rgba(20, 19, 34, 0.08);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
`

export const CatalogSplit = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 24px;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 1400px) {
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 20px;
  }

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`

export const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
`
