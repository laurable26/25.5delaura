import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg-main flex items-center justify-center px-4">
          <div className="bg-white rounded-card border border-border p-6 text-center max-w-sm w-full">
            <p className="font-bangers text-pink-fluo text-2xl tracking-wide mb-2">Oups !</p>
            <p className="font-nunito text-purple-mid text-sm mb-2">Une erreur inattendue s'est produite.</p>
            <p className="font-nunito text-red-500 text-xs mb-4 text-left bg-red-50 rounded p-2 break-all">
              {(this.state.error as Error)?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-btn bg-purple-dark text-white font-nunito font-bold text-sm"
            >
              Recharger
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
