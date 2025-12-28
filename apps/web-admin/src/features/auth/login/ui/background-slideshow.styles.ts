import styled from 'styled-components'

export const BackgroundContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  /* 배경 어둡게 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(120deg, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.18)),
      radial-gradient(100% 60% at 50% 0%, rgba(0, 0, 0, 0.12), transparent 60%);
    z-index: 2;
    pointer-events: none;
  }
`
