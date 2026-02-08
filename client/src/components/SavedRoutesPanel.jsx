import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import RunCard from './RunCard'
import {
  Trash2,
  MapPin,
  Loader2,
  Route,
  ChevronRight,
  ChevronDown,
  Plus,
  Play,
  Image,
  ArrowLeft,
} from 'lucide-react'

const API_BASE = 'http://localhost:3000/api'

export default function SavedRoutesPanel({ onClose, onShowPhotoPins }) {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  // Expanded route and its runs
  const [expandedRouteId, setExpandedRouteId] = useState(null)
  const [runs, setRuns] = useState([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  // New run dialog
  const [showNewRunDialog, setShowNewRunDialog] = useState(false)
  const [newRunForm, setNewRunForm] = useState({ name: '', duration: '', notes: '' })
  const [savingRun, setSavingRun] = useState(false)

  // Fetch routes
  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) { setStatus('Login to view routes'); setLoading(false); return }
      try {
        const res = await fetch(`${API_BASE}/routes`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Failed')
        setRoutes(data)
      } catch (err) {
        console.error('Fetch routes error:', err)
        setStatus(err.message || 'Error loading routes')
      } finally {
        setLoading(false)
      }
    }
    fetchRoutes()
  }, [])

  // Fetch runs when route is expanded
  const fetchRuns = useCallback(async (routeId) => {
    setLoadingRuns(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/routes/${routeId}/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setRuns(data)
    } catch (err) {
      console.error('Fetch runs error:', err)
    } finally {
      setLoadingRuns(false)
    }
  }, [])

  const handleExpandRoute = (routeId) => {
    if (expandedRouteId === routeId) {
      setExpandedRouteId(null)
      setRuns([])
    } else {
      setExpandedRouteId(routeId)
      fetchRuns(routeId)
    }
  }

  const handleLoadOnMap = (route) => {
    window.dispatchEvent(new CustomEvent('load-route', { detail: route }))
    onClose?.()
  }

  const handleDeleteRoute = async (route, e) => {
    e.stopPropagation()
    if (!confirm(`Delete route "${route.name || 'Unnamed'}" and all its runs?`)) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/routes/${route._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      setRoutes((prev) => prev.filter((r) => r._id !== route._id))
      if (expandedRouteId === route._id) {
        setExpandedRouteId(null)
        setRuns([])
      }
    } catch (err) {
      console.error('Delete route error:', err)
      alert(err.message)
    }
  }

  const handleCreateRun = async () => {
    if (!expandedRouteId) return
    setSavingRun(true)
    const token = localStorage.getItem('token')

    try {
      const route = routes.find((r) => r._id === expandedRouteId)
      const res = await fetch(`${API_BASE}/routes/${expandedRouteId}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRunForm.name || `Run on ${new Date().toLocaleDateString()}`,
          distance: route?.distance,
          duration: newRunForm.duration ? parseInt(newRunForm.duration) * 60 : undefined,
          notes: newRunForm.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      
      setRuns((prev) => [data, ...prev])
      setShowNewRunDialog(false)
      setNewRunForm({ name: '', duration: '', notes: '' })
    } catch (err) {
      console.error('Create run error:', err)
      alert(err.message)
    } finally {
      setSavingRun(false)
    }
  }

  const handleDeleteRun = (runId) => {
    setRuns((prev) => prev.filter((r) => r._id !== runId))
  }

  const handleUpdateRun = (updatedRun) => {
    setRuns((prev) => prev.map((r) => (r._id === updatedRun._id ? updatedRun : r)))
  }

  const expandedRoute = routes.find((r) => r._id === expandedRouteId)

  // Total photos across all runs
  const totalPhotos = runs.reduce((sum, run) => sum + (run.photos?.length || 0), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header area handled by parent App.jsx */}

      <div className="flex-1 overflow-y-auto p-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="text-sm">Loading routes...</span>
          </div>
        ) : status ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{status}</div>
        ) : routes.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="size-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No saved routes yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Create a route on the map to save it
            </p>
          </div>
        ) : expandedRouteId && expandedRoute ? (
          /* ---------- Expanded Route View ---------- */
          <div className="space-y-4">
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 -ml-2 text-muted-foreground"
              onClick={() => { setExpandedRouteId(null); setRuns([]); }}
            >
              <ArrowLeft className="size-4" />
              All Routes
            </Button>

            {/* Route header */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{expandedRoute.name || 'Unnamed Route'}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {expandedRoute.distance > 0 && (
                  <Badge variant="secondary">{(expandedRoute.distance / 1000).toFixed(2)} km</Badge>
                )}
                <span>{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
                {totalPhotos > 0 && (
                  <span className="flex items-center gap-1">
                    <Image className="size-3" />
                    {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => handleLoadOnMap(expandedRoute)}
              >
                <MapPin className="size-4" />
                Load on Map
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setShowNewRunDialog(true)}
              >
                <Plus className="size-4" />
                Log Run
              </Button>
            </div>

            {/* Runs list */}
            {loadingRuns ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin mr-2" />
                <span className="text-sm">Loading runs...</span>
              </div>
            ) : runs.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border/60 rounded-lg">
                <Play className="size-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No runs logged yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Log your first run to add photos
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => (
                  <RunCard
                    key={run._id}
                    run={run}
                    onDelete={handleDeleteRun}
                    onUpdate={handleUpdateRun}
                    showPhotoPins={onShowPhotoPins}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ---------- Routes List View ---------- */
          <div className="space-y-1">
            {routes.map((route) => (
              <div
                key={route._id}
                className="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleExpandRoute(route._id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Route className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{route.name || 'Unnamed route'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {route.distance > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {(route.distance / 1000).toFixed(2)} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteRoute(route, e)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Run Dialog */}
      <Dialog open={showNewRunDialog} onOpenChange={setShowNewRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a Run</DialogTitle>
            <DialogDescription>
              Record a run session for this route. You can add photos after creating.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="runName">Name (optional)</Label>
              <Input
                id="runName"
                value={newRunForm.name}
                onChange={(e) => setNewRunForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Morning run"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="runDuration">Duration (minutes)</Label>
              <Input
                id="runDuration"
                type="number"
                value={newRunForm.duration}
                onChange={(e) => setNewRunForm((f) => ({ ...f, duration: e.target.value }))}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="runNotes">Notes (optional)</Label>
              <Input
                id="runNotes"
                value={newRunForm.notes}
                onChange={(e) => setNewRunForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Felt great today!"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRunDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRun} disabled={savingRun}>
              {savingRun ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Log Run'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
