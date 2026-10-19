import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useSentinelStore } from './store/useSentinelStore'

if (typeof window !== 'undefined') {
  (window as unknown as { useSentinelStore: typeof useSentinelStore }).useSentinelStore = useSentinelStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
