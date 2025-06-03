// Utility functions for track image handling

// Create a themed gradient fallback that matches the app's purple/pink theme
export const getThemedTrackImage = (track) => {
  if (track.artwork_url && !track.artwork_url.includes('placeholder')) {
    return track.artwork_url
  }
  
  if (track.cover_url && !track.cover_url.includes('placeholder')) {
    return track.cover_url
  }
  
  // Create a themed gradient fallback that matches the app's purple/pink theme
  const gradients = [
    'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',  // Purple to Pink
    'linear-gradient(135deg, #a855f7 0%, #f472b6 100%)',  // Light Purple to Light Pink
    'linear-gradient(135deg, #7c3aed 0%, #e879f9 100%)',  // Violet to Fuchsia
    'linear-gradient(135deg, #6366f1 0%, #f59e0b 100%)',  // Indigo to Amber
    'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',  // Purple to Cyan
    'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',  // Pink to Amber
    'linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)',  // Emerald to Purple
    'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',  // Red to Pink
  ]
  
  // Use track ID to consistently assign the same gradient to the same track
  const gradientIndex = track.id ? 
    track.id.toString().charCodeAt(0) % gradients.length : 
    Math.floor(Math.random() * gradients.length)
  
  // Get first letter of track title for the cover
  const firstLetter = (track.title || 'M').charAt(0).toUpperCase()
  
  // Create unique IDs for SVG elements to avoid conflicts
  const uniqueId = track.id ? track.id.toString().replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substr(2, 9)
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.4)"/>
        </filter>
        <filter id="glow${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background gradient -->
      <rect width="300" height="300" fill="url(#bgGrad${uniqueId})" rx="12"/>
      
      <!-- Central letter -->
      <g transform="translate(150, 150)" filter="url(#shadow${uniqueId})">
        <circle cx="0" cy="0" r="50" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <text x="0" y="12" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="bold" 
              text-anchor="middle" fill="white" opacity="0.95">${firstLetter}</text>
      </g>
      
      <!-- Decorative music elements -->
      <g opacity="0.15" filter="url(#glow${uniqueId})">
        <path d="M50 80 Q 80 50, 110 80 T 170 80" stroke="white" stroke-width="3" fill="none"/>
        <path d="M130 220 Q 160 190, 190 220 T 250 220" stroke="white" stroke-width="3" fill="none"/>
        <circle cx="80" cy="75" r="4" fill="white"/>
        <circle cx="140" cy="85" r="4" fill="white"/>
        <circle cx="160" cy="215" r="4" fill="white"/>
        <circle cx="220" cy="225" r="4" fill="white"/>
        
        <!-- Musical notes -->
        <g transform="translate(220, 60)" fill="white">
          <circle cx="0" cy="12" r="6"/>
          <rect x="6" y="-15" width="2" height="30"/>
          <path d="M8 -15 Q 15 -20, 20 -15 L 20 -10 Q 15 -15, 8 -10 Z"/>
        </g>
        
        <g transform="translate(60, 240)" fill="white">
          <circle cx="0" cy="12" r="5"/>
          <rect x="5" y="-12" width="2" height="25"/>
        </g>
      </g>
      
      <!-- Subtle border -->
      <rect x="2" y="2" width="296" height="296" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="12"/>
    </svg>
  `)}`
}

// Alternative function for smaller thumbnails (40x40, 60x60, etc.)
export const getThemedTrackThumbnail = (track, size = 60) => {
  if (track.artwork_url && !track.artwork_url.includes('placeholder')) {
    return track.artwork_url
  }
  
  if (track.cover_url && !track.cover_url.includes('placeholder')) {
    return track.cover_url
  }
  
  const firstLetter = (track.title || 'M').charAt(0).toUpperCase()
  const uniqueId = track.id ? track.id.toString().replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substr(2, 9)
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradThumb${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="${size}" height="${size}" fill="url(#bgGradThumb${uniqueId})" rx="${size * 0.1}"/>
      
      <g transform="translate(${size/2}, ${size/2})">
        <circle cx="0" cy="0" r="${size * 0.25}" fill="rgba(255,255,255,0.2)"/>
        <text x="0" y="${size * 0.1}" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" 
              text-anchor="middle" fill="white" opacity="0.9">${firstLetter}</text>
      </g>
    </svg>
  `)}`
}

// Function to handle image loading errors with themed fallback
export const handleImageError = (event, track) => {
  event.target.src = getThemedTrackImage(track)
  event.target.onerror = null // Prevent infinite loop
}

// Function to get album info with fallbacks
export const getTrackInfo = (track) => {
  return {
    title: track.title || 'Unknown Title',
    artist: track.artist || 'Unknown Artist',
    album: track.album || track.title || 'Unknown Album',
    artwork_url: getThemedTrackImage(track)
  }
} 