import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ChatInterface from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatInterface />
  </StrictMode>,
)
