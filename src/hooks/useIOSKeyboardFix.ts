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

export function useIOSStandaloneViewportFix() {
  useLayoutEffect(() => {
    if (!isIOSDevice()) return

    const root = document.documentElement
    const visualViewport = window.visualViewport
    let settleTimeoutId: number | null = null
    let focusOutTimeoutId: number | null = null

    function syncAppHeight() {
      const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight)
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
      handleViewportChange()
    }

    function handlePageShow() {
      handleViewportChange()
    }

    function handleFocusOut(e: FocusEvent) {
      const target = e.target
      if (!(target instanceof HTMLElement)) return

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        if (focusOutTimeoutId !== null) {
          window.clearTimeout(focusOutTimeoutId)
        }

        focusOutTimeoutId = window.setTimeout(() => {
          focusOutTimeoutId = null
          window.scrollTo(0, 0)
          syncAppHeight()
          queueSettledSync()
        }, 50)
      }
    }

    syncAppHeight()
    queueSettledSync()

    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('focusout', handleFocusOut)

    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange)
    }

    return () => {
      if (settleTimeoutId !== null) {
        window.clearTimeout(settleTimeoutId)
      }

      if (focusOutTimeoutId !== null) {
        window.clearTimeout(focusOutTimeoutId)
      }

      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('focusout', handleFocusOut)

      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange)
      }

      root.style.removeProperty('--app-height')
    }
  }, [])
}
