const API_BASE_URL = '/api'

class ApiService {
  constructor() {
    this.token = localStorage.getItem('auth_token')
  }

  // Set authentication token
  setAuthToken(token) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  // Clear authentication token
  clearAuthToken() {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  // Helper method to get authorization headers
  getAuthHeaders() {
    const token = this.token || localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  // Generic request method with retry logic
  async request(endpoint, options = {}, retries = 2) {
    const url = `${API_BASE_URL}${endpoint}`
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config)
        
        if (response.status === 401) {
          // Token expired, clear auth state
          this.clearAuthToken()
          localStorage.removeItem('user_data')
          throw new Error('Authentication required')
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          
          // For 5xx errors on Audius endpoints, retry
          if (response.status >= 500 && endpoint.includes('/audius/') && attempt < retries) {
            console.warn(`API attempt ${attempt + 1} failed, retrying...`, errorData)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
            continue
          }
          
          throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        if (attempt === retries) {
          console.error('API request failed after retries:', error)
          throw error
        }
        
        // Retry network errors for Audius endpoints
        if (endpoint.includes('/audius/') && (
          error.name === 'TypeError' || 
          error.message.includes('fetch') || 
          error.message.includes('network')
        )) {
          console.warn(`Network error attempt ${attempt + 1}, retrying...`, error.message)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        }
        
        throw error
      }
    }
  }

  // Authentication APIs
  async login(credentials) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  async signup(userData) {
    return this.request('/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  async getCurrentUser() {
    return this.request('/profile')
  }

  async refreshToken() {
    return this.request('/refresh', {
      method: 'POST'
    })
  }

  // User APIs
  async getUserProfile(userId) {
    return this.request(`/users/${userId}`)
  }

  async updateUserProfile(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
  }

  async uploadProfileImage(userId, formData) {
    const token = localStorage.getItem('token')
    return fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    }).then(res => res.json())
  }

  // Music API methods (Jamendo)
  async getMusicTrending(genre = null, limit = 20) {
    let url = '/music/trending';
    const params = new URLSearchParams();
    if (genre) params.append('genre', genre);
    if (limit) params.append('limit', limit);
    if (params.toString()) url += '?' + params.toString();
    return this.request(url);
  }

  async searchMusicTracks(query, genre = null, limit = 20) {
    let url = `/music/search?query=${encodeURIComponent(query)}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (limit) url += `&limit=${limit}`;
    return this.request(url);
  }

  async getMusicTrack(trackId) {
    return this.request(`/music/track/${trackId}`);
  }

  async getMusicByGenre(genre, limit = 20, featured = false) {
    let url = `/music/genre/${encodeURIComponent(genre)}?limit=${limit}`;
    if (featured) url += '&featured=true';
    return this.request(url);
  }

  async getMusicPlaylists(userId = null, limit = 20) {
    let url = `/music/playlists?limit=${limit}`;
    if (userId) url += `&user_id=${userId}`;
    return this.request(url);
  }

  async getPlaylistTracks(playlistId, limit = 50) {
    return this.request(`/music/playlist/${playlistId}/tracks?limit=${limit}`);
  }

  // Comprehensive Audius API methods
  async getAudiusTrending(genre = null, time = null, limit = 20) {
    let url = `/audius/trending?limit=${limit}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    return this.request(url);
  }

  async searchAudiusTracks(query, genre = null, onlyDownloadable = false, limit = 20) {
    if (!query) throw new Error('Search query is required');
    
    let url = `/audius/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (onlyDownloadable) url += `&only_downloadable=true`;
    return this.request(url);
  }

  async getAudiusTrack(trackId) {
    return this.request(`/audius/track/${trackId}`);
  }

  async getAudiusTracksById(trackIds) {
    const ids = Array.isArray(trackIds) ? trackIds : [trackIds];
    const params = ids.map(id => `id=${encodeURIComponent(id)}`).join('&');
    return this.request(`/audius/tracks?${params}`);
  }

  async getAudiusTracksByPermalink(permalinks) {
    const links = Array.isArray(permalinks) ? permalinks : [permalinks];
    const params = links.map(link => `permalink=${encodeURIComponent(link)}`).join('&');
    return this.request(`/audius/tracks?${params}`);
  }

  async getAudiusUnderground(limit = 20) {
    return this.request(`/audius/underground?limit=${limit}`);
  }

  async getAudiusUserPlaylists(userId, limit = 20) {
    return this.request(`/audius/users/${userId}/playlists?limit=${limit}`);
  }

  async getAudiusPlaylistTracks(playlistId, limit = 50) {
    return this.request(`/audius/playlists/${playlistId}/tracks?limit=${limit}`);
  }

  async streamAudiusTrack(trackId) {
    return `${API_BASE_URL}/audius/stream/${trackId}`;
  }

  async checkAudiusStatus() {
    return this.request('/audius/status');
  }

  // Playlist APIs
  async getUserPlaylists(userId) {
    return this.request(`/users/${userId}/playlists`)
  }

  async createPlaylist(playlistData) {
    return this.request('/playlists', {
      method: 'POST',
      body: JSON.stringify(playlistData)
    })
  }

  async getPlaylist(playlistId) {
    return this.request(`/playlists/${playlistId}`)
  }

  async updatePlaylist(playlistId, playlistData) {
    return this.request(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: JSON.stringify(playlistData)
    })
  }

  async deletePlaylist(playlistId) {
    return this.request(`/playlists/${playlistId}`, {
      method: 'DELETE'
    })
  }

  async addTrackToPlaylist(playlistId, trackId) {
    return this.request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId })
    })
  }

  async removeTrackFromPlaylist(playlistId, trackId) {
    return this.request(`/playlists/${playlistId}/tracks/${trackId}`, {
      method: 'DELETE'
    })
  }

  // Liked Songs APIs
  async getLikedSongs() {
    return this.request('/users/me/liked-songs')
  }

  async likeTrack(trackId) {
    return this.request('/users/me/liked-songs', {
      method: 'POST',
      body: JSON.stringify({ trackId })
    })
  }

  async unlikeTrack(trackId) {
    return this.request(`/users/me/liked-songs/${trackId}`, {
      method: 'DELETE'
    })
  }

  // Categories APIs
  async getCategories() {
    return this.request('/music/categories')
  }

  async getCategoryTracks(categoryId) {
    return this.request(`/music/categories/${categoryId}/tracks`)
  }

  // Utility methods
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      return response.ok
    } catch {
      return false
    }
  }
}

export default new ApiService()