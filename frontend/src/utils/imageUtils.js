// Image loading utilities for TuneTrail
import React from 'react'

// List of known problematic Audius CDN domains that often timeout
const PROBLEMATIC_DOMAINS = [
  'audius-content-2.cultur3stake.com',
  'audius-content-3.cultur3stake.com',
  'audius-content-4.cultur3stake.com'
]

// Check if an image URL is from a problematic domain
export const isProblematicImageUrl = (url) => {
  if (!url) return false
  return PROBLEMATIC_DOMAINS.some(domain => url.includes(domain))
}

// Get a safe image URL with fallback
export const getSafeImageUrl = (originalUrl, fallbackUrl = '/images/placeholder.jpg') => {
  if (!originalUrl) return fallbackUrl
  
  // If it's a known problematic URL, return fallback immediately
  if (isProblematicImageUrl(originalUrl)) {
    console.warn(`Using fallback for problematic image URL: ${originalUrl}`)
    return fallbackUrl
  }
  
  return originalUrl
}

// Preload an image and return a promise
export const preloadImage = (src, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image load timeout: ${src}`))
    }, timeout)
    
    img.onload = () => {
      clearTimeout(timeoutId)
      resolve(src)
    }
    
    img.onerror = () => {
      clearTimeout(timeoutId)
      reject(new Error(`Image load failed: ${src}`))
    }
    
    img.src = src
  })
}

// Create an optimized image component props
export const getOptimizedImageProps = (originalSrc, alt = '', fallbackSrc = '/images/placeholder.jpg') => {
  const safeSrc = getSafeImageUrl(originalSrc, fallbackSrc)
  
  return {
    src: safeSrc,
    alt,
    loading: 'lazy',
    onError: (e) => {
      if (e.target.src !== fallbackSrc) {
        console.warn(`Image failed to load, using fallback: ${e.target.src}`)
        e.target.src = fallbackSrc
      }
    },
    style: {
      transition: 'opacity 0.3s ease',
    }
  }
}

// Hook for managing image loading state
export const useImageLoader = (src, fallbackSrc = '/images/placeholder.jpg') => {
  const [imageSrc, setImageSrc] = React.useState(getSafeImageUrl(src, fallbackSrc))
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  
  React.useEffect(() => {
    if (!src) {
      setImageSrc(fallbackSrc)
      return
    }
    
    const safeSrc = getSafeImageUrl(src, fallbackSrc)
    
    if (safeSrc === fallbackSrc) {
      setImageSrc(fallbackSrc)
      setHasError(true)
      return
    }
    
    setIsLoading(true)
    setHasError(false)
    
    preloadImage(safeSrc)
      .then(() => {
        setImageSrc(safeSrc)
        setIsLoading(false)
      })
      .catch(() => {
        setImageSrc(fallbackSrc)
        setIsLoading(false)
        setHasError(true)
      })
  }, [src, fallbackSrc])
  
  return { imageSrc, isLoading, hasError }
} 