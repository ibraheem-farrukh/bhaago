import { useEffect, useState } from 'react'

export default function SavedRoutesPanel({ onClose }) {
  const [savedRoutes, setSavedRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) { setStatus('Login to view routes'); setLoading(false); return }
      try {
        const res = await fetch('http://localhost:3000/api/routes', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ? `${data.message}: ${data.error}` : data.message || 'Failed')
        setSavedRoutes(data)
      } catch (err) {
        console.error('Fetch saved routes error:', err)
        setStatus(err.message || 'Error loading routes')
      } finally {
        setLoading(false)
      }
    }

    fetchRoutes()
  }, [])

  const handleSelect = (route) => {
    window.dispatchEvent(new CustomEvent('load-route', { detail: route }))
    if (onClose) onClose()
  }

  const handleDelete = async (route) => {
    if (!window.confirm(`Delete route "${route.name || 'Unnamed route'}"?`)) return
    setStatus('')
    const token = localStorage.getItem('token')
    if (!token) { setStatus('You must be logged in to delete routes'); return }
    try {
      const res = await fetch(`http://localhost:3000/api/routes/${route._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ? `${data.message}: ${data.error}` : data.message || 'Delete failed')
      setSavedRoutes(prev => prev.filter(r => r._id !== route._id))
      setStatus('Route deleted')
    } catch (err) {
      console.error('Delete error:', err)
      setStatus(err.message || 'Error deleting')
    }
  }

  return (
    <div style={{ position: 'absolute', top: 56, right: 20, zIndex: 2000 }}>
      <div style={{ width: 320, background: '#fff', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', padding: 12, color: '#323232' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>My Saved Routes</strong>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        {loading ? (
          <div style={{ marginTop: 12, color: '#666' }}>Loading...</div>
        ) : status ? (
          <div style={{ marginTop: 12, color: '#c33' }}>{status}</div>
        ) : savedRoutes.length === 0 ? (
          <div style={{ marginTop: 12, color: '#666' }}>No saved routes</div>
        ) : (
          <div style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
            {savedRoutes.map(route => (
              <div key={route._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', color: '#323232' }}>
                <div style={{ cursor: 'pointer' }} onClick={() => handleSelect(route)}>{route.name || 'Unnamed route'}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>{route.distance ? `${(route.distance/1000).toFixed(2)} km` : ''}</div>
                  <button onClick={() => handleDelete(route)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#ff4d4f', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
