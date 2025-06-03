// Performance monitoring utilities

export const logPerformance = (label, startTime) => {
  if (process.env.NODE_ENV === 'development') {
    const endTime = performance.now()
    const duration = endTime - startTime
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
  }
}

export const measureAsync = async (label, asyncFn) => {
  const startTime = performance.now()
  try {
    const result = await asyncFn()
    logPerformance(label, startTime)
    return result
  } catch (error) {
    logPerformance(`${label} (ERROR)`, startTime)
    throw error
  }
}

export const debounce = (func, wait, immediate) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

export const throttle = (func, limit) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Monitor network requests
export const monitorFetch = () => {
  if (process.env.NODE_ENV === 'development') {
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      const startTime = performance.now()
      const url = args[0]
      console.log(`🌐 Fetching: ${url}`)
      
      return originalFetch.apply(this, args)
        .then(response => {
          const duration = performance.now() - startTime
          console.log(`✅ ${url} - ${response.status} - ${duration.toFixed(2)}ms`)
          return response
        })
        .catch(error => {
          const duration = performance.now() - startTime
          console.error(`❌ ${url} - ERROR - ${duration.toFixed(2)}ms`, error)
          throw error
        })
    }
  }
}

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    monitorFetch()
    
    // Monitor font loading
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        console.log('✅ All fonts loaded')
      })
    }
    
    // Monitor large images
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      if (!img.complete) {
        const startTime = performance.now()
        img.addEventListener('load', () => {
          const duration = performance.now() - startTime
          console.log(`🖼️ Image loaded: ${img.src} - ${duration.toFixed(2)}ms`)
        })
        img.addEventListener('error', () => {
          const duration = performance.now() - startTime
          console.error(`❌ Image failed: ${img.src} - ${duration.toFixed(2)}ms`)
        })
      }
    })
  }
} 