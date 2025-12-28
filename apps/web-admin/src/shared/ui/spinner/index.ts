export { default as Spinner } from './spinner.ui'
export { default as SpinnerOverlay } from './spinner-overlay.ui'

// optional model placeholder for compatibility
export const spinnerModel = {
  globalSpinner: {
    getState: () => ({ show: () => {}, hide: () => {} }),
  },
}
