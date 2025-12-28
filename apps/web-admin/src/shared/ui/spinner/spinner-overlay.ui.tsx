import React from 'react'
import styled from 'styled-components'
import Spinner from './spinner.ui'
import { Z_INDEX } from '@/shared/styles/z-index'

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${Z_INDEX.LOADING_OVERLAY};
`

export default function SpinnerOverlay() {
  return (
    <Overlay>
      <Spinner />
    </Overlay>
  )
}
