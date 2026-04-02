import { useLayoutEffect } from 'react'

function isIOSDevice() {
  const platform = navigator.platform
  const userAgent = navigator.userAgent
  const maxTouchPoints = navigator.maxTouchPoints || 0
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && maxTouchPoints > 1)
  )
}

export function isIOSStandalonePWA() {
  if (!isIOSDevice()) return false

  return (
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

function isTextInputElement(
  element: Element | null
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLSelectElement)
  ) {
    return false
  }

  return !element.disabled
}

export function useIOSStandaloneViewportFix() {
  useLayoutEffect(() => {
    if (!isIOSStandalonePWA()) return

    const root = document.documentElement
    const visualViewport = window.visualViewport
    let settleTimeoutId: number | null = null
    let focusInTimeoutId: number | null = null
    let focusOutTimeoutId: number | null = null
    let committedHeight = Math.round(visualViewport?.height ?? window.innerHeight)

    function getViewportHeight() {
      return Math.round(visualViewport?.height ?? window.innerHeight)
    }

    function syncAppHeight(force = false) {
      const viewportHeight = getViewportHeight()
      const activeElement = document.activeElement
      const keyboardLikelyOpen =
        isTextInputElement(activeElement) && viewportHeight < committedHeight - 120

      if (!force && keyboardLikelyOpen) {
        root.style.setProperty('--app-height', `${committedHeight}px`)
        return
      }

      committedHeight = viewportHeight
      root.style.setProperty('--app-height', `${viewportHeight}px`)
    }

    function queueSettledSync(delay = 250) {
      if (settleTimeoutId !== null) {
        window.clearTimeout(settleTimeoutId)
      }

      settleTimeoutId = window.setTimeout(() => {
        settleTimeoutId = null
        syncAppHeight()
      }, delay)
    }

    function handleViewportChange() {
      syncAppHeight()
      queueSettledSync()
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      syncAppHeight(true)
      queueSettledSync()
    }

    function handlePageShow() {
      syncAppHeight(true)
      queueSettledSync()
    }

    function handleFocusIn(e: FocusEvent) {
      const target = e.target instanceof HTMLElement ? e.target : null
      if (!isTextInputElement(target)) return

      if (focusInTimeoutId !== null) {
        window.clearTimeout(focusInTimeoutId)
      }

      focusInTimeoutId = window.setTimeout(() => {
        focusInTimeoutId = null
        target.scrollIntoView({ block: 'center', inline: 'nearest' })
      }, 300)
    }

    function handleFocusOut(e: FocusEvent) {
      const target = e.target instanceof HTMLElement ? e.target : null
      if (isTextInputElement(target)) {
        if (focusOutTimeoutId !== null) {
          window.clearTimeout(focusOutTimeoutId)
        }

        focusOutTimeoutId = window.setTimeout(() => {
          focusOutTimeoutId = null
          window.scrollTo(0, 0)
          syncAppHeight(true)
          queueSettledSync()
        }, 50)
      }
    }

    syncAppHeight(true)
    queueSettledSync()

    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange)
    }

    return () => {
      if (settleTimeoutId !== null) {
        window.clearTimeout(settleTimeoutId)
      }

      if (focusInTimeoutId !== null) {
        window.clearTimeout(focusInTimeoutId)
      }

      if (focusOutTimeoutId !== null) {
        window.clearTimeout(focusOutTimeoutId)
      }

      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)

      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange)
      }

      root.style.removeProperty('--app-height')
    }
  }, [])
}
