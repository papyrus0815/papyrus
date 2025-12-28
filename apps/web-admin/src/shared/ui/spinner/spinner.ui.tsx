import React from 'react'
import styled, { keyframes } from 'styled-components'

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const SpinnerContainer = styled.div`
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: ${rotate} 1s linear infinite;
`

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
`

export default function Spinner() {
  return (
    <Wrapper>
      <SpinnerContainer />
    </Wrapper>
  )
}
