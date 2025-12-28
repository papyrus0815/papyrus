import styled from 'styled-components'

export const WelcomeContainer = styled.div`
  text-align: center;
  margin-bottom: 1rem;
`

export const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

export const WelcomeSubtitle = styled.p`
  color: #a0aec0;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`
