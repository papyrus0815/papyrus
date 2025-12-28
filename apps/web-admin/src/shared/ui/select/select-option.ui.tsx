import React, { forwardRef, SelectHTMLAttributes, useId } from 'react';
import styled from 'styled-components';

/* ------------------------------
     Interfaces & Types
  ------------------------------ */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  width?: string;
  padding?: string;
  borderRadius?: string;
  borderColor?: string;
  focusRingColor?: string;
  options?: SelectOption[];
}

interface StyledSelectProps {
  $error?: boolean;
  width?: string;
  padding?: string;
  borderRadius?: string;
  borderColor?: string;
  focusRingColor?: string;
}

/* ------------------------------
     Styled Components
  ------------------------------ */
const StyledSelect = styled.select<StyledSelectProps>`
  width: ${({ width }) => width || '100%'};
  padding: ${({ padding }) => padding || '0.75rem 1rem'};
  border: 1px solid
    ${({ $error, borderColor }) => ($error ? '#f56565' : borderColor || '#ccc')};
  border-radius: ${({ borderRadius }) => borderRadius || '0.5rem'};
  outline: none;
  background-color: #fff;
  /* 기본 select 화살표 제거 및 커스텀 아이콘 추가 */
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg width='10' height='7' viewBox='0 0 10 7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  transition:
    box-shadow 0.2s ease-in-out,
    border-color 0.2s ease-in-out;

  &:hover {
    border-color: ${({ $error, borderColor }) =>
      $error ? '#f56565' : borderColor ? borderColor : '#999'};
  }

  &:focus {
    box-shadow: 0 0 0 2px
      ${({ $error, focusRingColor }) =>
        $error ? '#f56565' : focusRingColor || '#A855F7'};
    border-color: ${({ $error, focusRingColor }) =>
      $error ? '#f56565' : focusRingColor || '#A855F7'};
  }
`;

const FieldGroup = styled.div`
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
`;

const GroupLabel = styled.label`
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
`;

/* ------------------------------
     Components
  ------------------------------ */
const SelectInput = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      error = false,
      width,
      padding,
      borderRadius,
      borderColor,
      focusRingColor,
      children,
      ...props
    },
    ref,
  ) => (
    <StyledSelect
      ref={ref}
      $error={error}
      width={width}
      padding={padding}
      borderRadius={borderRadius}
      borderColor={borderColor}
      focusRingColor={focusRingColor}
      {...props}
    >
      {options
        ? options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))
        : children}
    </StyledSelect>
  ),
);

SelectInput.displayName = 'SelectInput';

export const SelectField: React.FC<
  {
    label: string;
    error?: boolean;
    options?: SelectOption[];
  } & SelectHTMLAttributes<HTMLSelectElement>
> = ({ label, options, error, id, ...props }) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <FieldGroup>
      <GroupLabel htmlFor={inputId}>{label}</GroupLabel>
      <SelectInput options={options} error={error} id={inputId} {...props} />
    </FieldGroup>
  );
};
