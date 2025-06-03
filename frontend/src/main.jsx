import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { initPerformanceMonitoring } from './utils/performance.js'
import '../CSS/main.css'
import '../CSS/animations.css'
import '../CSS/components.css'
import '../CSS/enhanced.css'

// Initialize performance monitoring in development
if (process.env.NODE_ENV === 'development') {
  initPerformanceMonitoring()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
) 