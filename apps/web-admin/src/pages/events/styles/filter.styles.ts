/**
 * Filter Sidebar Styled Components
 * 필터 사이드바 및 세기 선택 관련 스타일
 */
import styled, { css } from 'styled-components'

export const FilterColumn = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  flex: 1;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }

  @media (max-width: 768px) { position: static; max-height: none; overflow-y: visible; }
`

export const FilterBlock = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 0;
`

export const FilterBlockLabel = styled.div`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#94a3b8'};
`

export const FilterSearchInput = styled.input`
  border-radius: 10px;
  padding: 9px 14px 9px 36px;
  font-size: 13px;
  transition: all 0.2s ease;
  min-width: 200px;
  max-width: 300px;
  &::placeholder { font-size: 12px; color: #94a3b8; }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.05) url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="11" cy="11" r="8"/%3E%3Cline x1="21" y1="21" x2="16.65" y2="16.65"/%3E%3C/svg%3E') no-repeat 12px 50%;
    background-size: 14px;
    border: 1.5px solid rgba(255,255,255,0.1);
    color: #e2e8f0;
    &:hover { background-color: rgba(255,255,255,0.07); border-color: rgba(99,102,241,0.3); }
    &:focus { outline: none; border-color: rgba(99,102,241,0.5); background-color: rgba(255,255,255,0.07); box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
  ` : css`
    background: #f8fafc url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="11" cy="11" r="8"/%3E%3Cline x1="21" y1="21" x2="16.65" y2="16.65"/%3E%3C/svg%3E') no-repeat 12px 50%;
    background-size: 14px;
    border: 1.5px solid rgba(203,213,225,0.6);
    color: #0f172a;
    &:hover { background-color: #ffffff; border-color: rgba(99,102,241,0.2); }
    &:focus { outline: none; border-color: rgba(99,102,241,0.5); background-color: #ffffff; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
  `}
`

export const FilterTriggerButton = styled.button`
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  svg { color: #6366f1; flex-shrink: 0; transition: all 0.2s ease; }
  &:hover svg { transform: translateX(2px); }
  &:focus { outline: none; border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
  &:active { transform: scale(0.98); }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    color: #94a3b8;
    &:hover { border-color: rgba(99,102,241,0.3); background: rgba(255,255,255,0.08); }
  ` : css`
    background: #f8fafc;
    border: 1.5px solid rgba(203,213,225,0.6);
    color: #1e293b;
    &:hover { border-color: rgba(99,102,241,0.3); background: #ffffff; box-shadow: 0 2px 6px rgba(99,102,241,0.1); }
  `}
`

export const FilterCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #6366f1;
  }

  span {
    font-size: 12px;
    font-weight: 500;
    color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#475569'};
  }

  &:hover span { color: #6366f1; }
`

export const FilterChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const FilterChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.3);
    color: #a5b4fc;
    button {
      display: flex; align-items: center; justify-content: center; padding: 2px;
      background: rgba(99,102,241,0.2); border: none; border-radius: 50%;
      color: #a5b4fc; cursor: pointer; transition: all 0.2s ease;
      &:hover { background: rgba(99,102,241,0.35); }
    }
  ` : css`
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border: 1px solid rgba(99,102,241,0.25);
    color: #4f46e5;
    button {
      display: flex; align-items: center; justify-content: center; padding: 2px;
      background: rgba(99,102,241,0.15); border: none; border-radius: 50%;
      color: #6366f1; cursor: pointer; transition: all 0.2s ease;
      &:hover { background: rgba(99,102,241,0.25); color: #4f46e5; }
    }
  `}

  span { white-space: nowrap; }
`

export const FilterResetButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid rgba(239,68,68,0.3);
  border-radius: 10px;
  padding: 9px 14px;
  background: rgba(239,68,68,0.05);
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  &:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.4); }
  &:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
`

export const FilterDivider = styled.hr`
  border: none;
  height: 1px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.12)'};
  margin: 8px 0;
`

export const CenturyHeader = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const CenturyTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const CenturyCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
`

export const CenturyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 768px) {
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding: 4px 0;
    &::-webkit-scrollbar { height: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 2px; }
  }
`

export const CenturyButton = styled.button<{ $active: boolean }>`
  border-radius: 10px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;

  ${({ $active }) => $active && `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
    }
  `}

  &:active { transform: scale(0.98); }

  @media (max-width: 768px) { flex-shrink: 0; min-width: 140px; }

  ${({ theme, $active }) => theme.mode === 'dark' ? css`
    background: ${$active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)'};
    border: 1.5px solid ${$active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'};
    box-shadow: ${$active ? '0 2px 8px rgba(99,102,241,0.15)' : 'none'};
    &:hover {
      border-color: rgba(99,102,241,0.35);
      background: ${$active ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.07)'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transform: translateX(2px);
    }
  ` : css`
    background: ${$active ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' : '#f8fafc'};
    border: 1.5px solid ${$active ? 'rgba(99,102,241,0.3)' : 'rgba(203,213,225,0.6)'};
    box-shadow: ${$active ? '0 2px 8px rgba(99,102,241,0.12)' : 'none'};
    &:hover {
      border-color: rgba(99,102,241,0.35);
      background: ${$active ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))' : 'linear-gradient(135deg, #ffffff 0%, rgba(249,250,251,1) 100%)'};
      box-shadow: 0 4px 12px rgba(99,102,241,0.12);
      transform: translateX(2px);
    }
  `}
`

export const CenturyLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#0f172a'};
  }

  span {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
  }
`

export const CenturyEventCount = styled.span`
  font-size: 11px;
  color: #6366f1;
  font-weight: 700;
  padding: 4px 10px;
  background: rgba(99,102,241,0.12);
  border-radius: 8px;
  align-self: flex-start;
  box-shadow: 0 1px 2px rgba(99,102,241,0.08);
`

export const ResultControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 12px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
  ` : css`
    background: #fff;
    border: 1px solid rgba(20,19,34,0.06);
    box-shadow: 0 2px 8px rgba(15,23,42,0.03);
  `}
`

export const SortDirectionToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
  svg { width: 14px; height: 14px; }
  &:hover { border-color: rgba(99,102,241,0.4); }
  &:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #94a3b8;
    &:hover { color: #e2e8f0; background: rgba(255,255,255,0.08); }
  ` : css`
    background: #fff;
    border: 1px solid rgba(15,23,42,0.12);
    color: #1f2937;
    &:hover { color: #111827; }
  `}
`

export const SortSelect = styled.select`
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  &:focus { outline: none; border-color: #6366f1; }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    color: #e2e8f0;
    option { background: #1e1e2e; color: #e2e8f0; }
    &:hover { background: rgba(255,255,255,0.07); border-color: rgba(99,102,241,0.3); }
  ` : css`
    background: #f8fafc;
    border: 1.5px solid rgba(203,213,225,0.6);
    color: #1e293b;
    option { background: #ffffff; color: #1f2937; }
    &:hover { background: #ffffff; border-color: rgba(99,102,241,0.2); }
  `}
`

export const ToolbarMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};

  span {
    padding: 6px 12px;
    background: rgba(99,102,241,0.08);
    border-radius: 999px;
    color: #4f46e5;
  }
`

export const FilterToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 10px;
  transition: all 0.2s ease;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.08);
    &:hover { background: rgba(255,255,255,0.07); }
  ` : css`
    background: #f8fafc;
    border: 1.5px solid rgba(203,213,225,0.6);
    &:hover { background: #ffffff; }
  `}
`

export const FilterToggleLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
`

export const CenturySelect = styled.select`
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 90px;
  &:focus { outline: none; border-color: #6366f1; }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    color: #e2e8f0;
    &:hover { background: rgba(255,255,255,0.07); border-color: rgba(99,102,241,0.3); }
  ` : css`
    background: #f8fafc;
    border: 1.5px solid rgba(203,213,225,0.6);
    color: #1e293b;
    &:hover { background: #ffffff; border-color: rgba(99,102,241,0.2); }
  `}
`

export const SortButton = styled.button`
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  svg { color: #6366f1; transition: all 0.2s ease; }
  &:hover svg { color: #4f46e5; }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    color: #64748b;
    &:hover { background: rgba(255,255,255,0.08); border-color: rgba(99,102,241,0.3); }
  ` : css`
    background: #f8fafc;
    border: 1.5px solid rgba(203,213,225,0.6);
    color: #64748b;
    &:hover { background: #ffffff; border-color: rgba(99,102,241,0.2); }
  `}
`

export const Switch = styled.button<{ $active?: boolean }>`
  position: relative;
  width: 42px;
  height: 22px;
  background: ${({ $active }) => $active ? '#6366f1' : '#cbd5e1'};
  border: none;
  border-radius: 11px;
  cursor: pointer;
  transition: all 0.25s ease;
  padding: 0;
  &:hover { background: ${({ $active }) => $active ? '#4f46e5' : '#94a3b8'}; }
  &:active { transform: scale(0.97); }
`

export const SwitchThumb = styled.div<{ $active?: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $active }) => $active ? '23px' : '3px'};
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`

export const ChildSortButtons = styled.div`
  display: flex;
  gap: 4px;
  width: 100%;
`

export const ChildSortButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 11px;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  border: 1px solid ${({ $active }) => $active ? '#6366f1' : 'rgba(203,213,225,0.6)'};
  background: ${({ theme, $active }) => $active
    ? 'rgba(99,102,241,0.08)'
    : theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ $active }) => $active ? '#6366f1' : 'inherit'};
  &:hover { border-color: #6366f1; background: rgba(99,102,241,0.05); }
`
