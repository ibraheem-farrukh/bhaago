import { useState } from 'react'
import Map from './components/Map'
import Auth from './components/Auth'

function App() {
  const [page, setPage] = useState('map')

  if (page === 'auth') {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setPage('map')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '10px 20px',
            backgroundColor: '#323232',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            zIndex: 1000
          }}
        >
          ← Back to Map
        </button>
        <Auth />
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#F9F6F0',
      position: 'relative'
    }}>
      <button
        onClick={() => setPage('auth')}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 20px',
          backgroundColor: '#FFB600',
          color: '#323232',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          zIndex: 1000
        }}
      >
        Login / Sign Up
      </button>
      <Map />
    </div>
  )
}

export default App
