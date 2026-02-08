import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { X, Trash2, MapPin, Loader2, Route } from 'lucide-react'

export default function SavedRoutesPanel({ onClose }) {
  const [savedRoutes, setSavedRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const panelRef = useRef(null)

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

  useEffect(() => {
    const handleOutside = (e) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target)) {
        if (onClose) onClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose])

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
    <div ref={panelRef} className="absolute top-14 right-0 z-50 w-80">
      <Card className="shadow-xl border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="size-4 text-primary" />
              <CardTitle className="text-base">My Routes</CardTitle>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="h-7 w-7">
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-3 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-sm">Loading routes...</span>
            </div>
          ) : status ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {status}
            </div>
          ) : savedRoutes.length === 0 ? (
            <div className="py-8 text-center">
              <MapPin className="size-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No saved routes yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create a route on the map to save it</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {savedRoutes.map(route => (
                <div
                  key={route._id}
                  className="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleSelect(route)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {route.name || 'Unnamed route'}
                    </p>
                    {route.distance > 0 && (
                      <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-5">
                        {(route.distance / 1000).toFixed(2)} km
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); handleDelete(route) }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
