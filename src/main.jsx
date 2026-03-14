import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'cesium/Build/Cesium/Widgets/widgets.css'

window.CESIUM_BASE_URL = '/cesiumStatic'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
