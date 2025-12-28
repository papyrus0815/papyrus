// InputField.tsx
import React, {
  forwardRef,
  InputHTMLAttributes,
  useState,
  useCallback,
  useEffect,
  useId,
} from 'react';
import styled from 'styled-components';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: boolean;
  errorMessage?: string;
  width?: string | number;
  padding?: string;
  borderRadius?: string;
  borderColor?: string;
  focusRingColor?: string;
}

const FieldGroup = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

interface FloatingLabelProps {
  $active: boolean;
}

const FloatingLabel = styled.label<FloatingLabelProps>`
  position: absolute;
  left: 1rem;
  top: ${({ $active }) => ($active ? '0.5rem' : '1.5rem')};
  font-size: ${({ $active }) => ($active ? '0.75rem' : '1rem')};
  color: ${({ $active }) => ($active ? '#A855F7' : '#777')};
  transition: all 0.2s ease;
  pointer-events: none;
`;

const StyledInput = styled.input<{
  $error?: boolean;
  width?: string | number;
  padding?: string;
  borderRadius?: string;
  borderColor?: string;
  focusRingColor?: string;
}>`
  width: ${({ width }) =>
    typeof width === 'number' ? `${width}px` : width || '100%'};
  padding: ${({ padding }) => padding || '1.5rem 1rem'};
  border: 1px solid
    ${({ $error, borderColor }) =>
      $error ? '#f56565' : borderColor || 'rgba(209, 213, 219, 0.5)'};
  border-radius: ${({ borderRadius }) => borderRadius || '0.75rem'};
  background: #fff;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  outline: none;

  &:focus {
    border-color: ${({ $error, focusRingColor }) =>
      $error ? '#f56565' : focusRingColor || '#A855F7'};
    box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.3);
  }
`;

const ErrorMessage = styled.div`
  color: #f56565;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      type = 'text',
      error = false,
      errorMessage,
      width,
      padding,
      borderRadius,
      borderColor,
      focusRingColor,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value);
    const generatedId = useId();
    const inputId = props.id || generatedId;

    useEffect(() => {
      if (props.value !== undefined) {
        setHasValue(!!props.value);
      }
    }, [props.value]);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        if (onFocus) onFocus(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        setHasValue(!!e.target.value);
        if (onBlur) onBlur(e);
      },
      [onBlur],
    );

    return (
      <FieldGroup>
        <StyledInput
          id={inputId}
          ref={ref}
          type={type}
          $error={error}
          width={width}
          padding={padding}
          borderRadius={borderRadius}
          borderColor={borderColor}
          focusRingColor={focusRingColor}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder=" "
          {...props}
        />
        <FloatingLabel htmlFor={inputId} $active={focused || hasValue}>
          {label}
        </FloatingLabel>
        {error && errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      </FieldGroup>
    );
  },
);

InputField.displayName = 'InputField';
