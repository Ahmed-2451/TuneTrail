import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Player from './Player'
import Chatbot from '../Chatbot/Chatbot'

const Layout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-container">
        <TopBar />
        <div className="content-area">
          <Outlet />
        </div>
      </div>
      <Player />
      <Chatbot />
    </div>
  )
}

export default Layout 