import React from 'react'

import styled from 'styled-components'

// ─── Styled primitives ────────────────────────────────────────────────────────

const StyledInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ $error, theme }) =>
    $error
      ? theme.colors.alert.danger.bg
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : '#fff'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : theme.colors.border.default};
  border-radius: 12px;
  outline: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled) {
    border-color: ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : theme.colors.border.medium};
    background: ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.bg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.11)'
          : '#fff'};
  }

  &:focus {
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
      ${({ theme }) => (theme.mode === 'dark' ? '#1e1e2e' : '#fff')} inset;
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
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ $error, theme }) =>
    $error
      ? theme.colors.alert.danger.bg
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : '#fff'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : theme.colors.border.default};
  border-radius: 12px;
  outline: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;
  resize: ${({ $resize = 'vertical' }) => $resize};
  line-height: 1.6;
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled) {
    border-color: ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : theme.colors.border.medium};
    background: ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.bg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.11)'
          : '#fff'};
  }

  &:focus {
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
