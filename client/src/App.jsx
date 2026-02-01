import { useState, useEffect } from 'react'
import Map from './components/Map'
import Auth from './components/Auth'

function App() {
  const [page, setPage] = useState('map')
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null
    } catch (e) {
      return null
    }
  })

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user') {
        try {
          setUser(JSON.parse(e.newValue))
        } catch (err) {
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setPage('auth')
  }

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
        <Auth onAuthSuccess={(userData) => { setUser(userData); setPage('map'); }} />
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

      {/* Account status in top-right */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '8px 12px',
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              color: '#323232',
              fontWeight: 600
            }}>
              {user.name}
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 12px',
                background: '#fff',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                color: '#323232',
                fontWeight: 600
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{
            padding: '8px 12px',
            background: '#fff',
            borderRadius: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            color: '#666'
          }}>Guest</div>
        )}
      </div>

      <Map />
    </div>
  )
}

export default App
