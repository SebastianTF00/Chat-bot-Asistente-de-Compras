import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Asegúrate de que apunte a App
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App /> {/* Aquí debe ir App, no Chat */}
  </React.StrictMode>,
)