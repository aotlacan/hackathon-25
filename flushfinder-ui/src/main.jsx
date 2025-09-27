import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MyMap from './map.jsx'
import Header from './header.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <MyMap />
    <App />
  </StrictMode>,
)
