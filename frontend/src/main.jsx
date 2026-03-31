import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import client from '../config/apollo.js'
import './index.css'
import App from './App.jsx'

const getAppScale = (width) => {
  // Keep desktop close to 110%, but avoid breaking layout on smaller screens.
  if (width >= 1366) return 1.1
  if (width >= 1024) return 1.05
  return 1
}

const AppScaleController = () => {
  useEffect(() => {
    const applyScale = () => {
      const scale = getAppScale(window.innerWidth)
      document.documentElement.style.setProperty('--app-scale', String(scale))
    }

    applyScale()
    window.addEventListener('resize', applyScale)

    return () => {
      window.removeEventListener('resize', applyScale)
      document.documentElement.style.removeProperty('--app-scale')
    }
  }, [])

  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <AppScaleController />
    </ApolloProvider>
</StrictMode>,
)
