import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import './index.css'
import { App } from './App'
import { base } from './lib/base'

const path = window.location.pathname.slice(base.length) || '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App path={path} />
  </StrictMode>,
)
