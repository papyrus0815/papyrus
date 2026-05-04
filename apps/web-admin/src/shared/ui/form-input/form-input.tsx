import React from 'react'

import styled from 'styled-components'

// ─── Styled primitives ────────────────────────────────────────────────────────

const StyledInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#e5e7eb'};
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.medium};
  }

  &:focus {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.primary};
    box-shadow: ${({ $error, theme }) =>
      $error ? theme.colors.focusRing.danger : theme.colors.focusRing.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px
      ${({ theme }) => (theme.mode === 'dark' ? '#1e1e2e' : '#f9fafb')} inset;
    -webkit-text-fill-color: ${({ theme }) => theme.colors.text.primary};
    caret-color: ${({ theme }) => theme.colors.text.primary};
  }

  &[type='number'] {
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
`

const StyledTextarea = styled.textarea<{
  $error?: boolean
  $resize?: 'none' | 'vertical' | 'both'
}>`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#e5e7eb'};
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
  box-sizing: border-box;
  resize: ${({ $resize = 'vertical' }) => $resize};
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.medium};
  }

  &:focus {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.primary};
    box-shadow: ${({ $error, theme }) =>
      $error ? theme.colors.focusRing.danger : theme.colors.focusRing.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// ─── Public components ────────────────────────────────────────────────────────

export type FormInputProps = React.ComponentPropsWithRef<'input'> & {
  $error?: boolean
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ $error, ...props }, ref) => (
    <StyledInput ref={ref} $error={$error} {...props} />
  ),
)
FormInput.displayName = 'FormInput'

export type FormTextareaProps = React.ComponentPropsWithRef<'textarea'> & {
  $error?: boolean
  $resize?: 'none' | 'vertical' | 'both'
}

export const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FormTextareaProps
>(({ $error, $resize, ...props }, ref) => (
  <StyledTextarea ref={ref} $error={$error} $resize={$resize} {...props} />
))
FormTextarea.displayName = 'FormTextarea'
