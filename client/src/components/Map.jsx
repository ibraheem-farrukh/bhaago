import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Map as MapComponent,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  MarkerPopup,
  MapRoute,
  useMap,
} from '@/components/ui/map'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Undo2,
  Save,
  MapPin,
  Ruler,
  Loader2,
  X,
  Image,
} from 'lucide-react'

// Inner component that uses useMap hook
function MapClickHandler({ onAddMarker }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return

    const handleClick = (e) => {
      onAddMarker([e.lngLat.lat, e.lngLat.lng])
    }

    map.on('click', handleClick)

    return () => {
      map.off('click', handleClick)
    }
  }, [map, isLoaded, onAddMarker])

  return null
}

export default function RoutePlanner({ photoPins = [], onClearPhotoPins }) {
  const [position, setPosition] = useState(null)
  const [markers, setMarkers] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null) // For photo pin popup
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [totalDistance, setTotalDistance] = useState(0)
  const [saveStatus, setSaveStatus] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const mapRef = useRef(null)

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.longitude, pos.coords.latitude]),
        () => setPosition([-0.09, 51.505]), // Fallback to London
      )
    } else {
      setPosition([-0.09, 51.505])
    }
  }, [])

  // Fetch route from OSRM
  useEffect(() => {
    const fetchRoute = async () => {
      if (markers.length < 2) {
        setRouteCoordinates([])
        setTotalDistance(0)
        return
      }

      const coordinates = markers.map(m => `${m.lngLat[0]},${m.lngLat[1]}`).join(';')

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson`
        )
        const data = await response.json()

        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates
          setRouteCoordinates(coords)
          setTotalDistance(data.routes[0].distance)
        }
      } catch (error) {
        console.error('Error fetching route:', error)
        setRouteCoordinates(markers.map(m => m.lngLat))
        setTotalDistance(0)
      }
    }
    fetchRoute()
  }, [markers])

  const handleAddMarker = useCallback((latLngArr) => {
    // latLngArr = [lat, lng] from map click, convert to [lng, lat] for maplibre
    setMarkers(prev => [...prev, { id: Date.now(), lngLat: [latLngArr[1], latLngArr[0]] }])
  }, [])

  const handleRemoveMarker = useCallback((markerId) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId))
  }, [])

  const handleUndo = useCallback(() => {
    setMarkers(prev => prev.length > 0 ? prev.slice(0, -1) : prev)
  }, [])

  const handleDragEnd = useCallback((markerId, lngLat) => {
    setMarkers(prev => prev.map(m =>
      m.id === markerId ? { ...m, lngLat: [lngLat.lng, lngLat.lat] } : m
    ))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo])

  // Load external route events
  useEffect(() => {
    const onLoadRoute = (e) => {
      const route = e.detail
      if (route && route.geometry && route.geometry.coordinates) {
        const coords = route.geometry.coordinates
        setRouteCoordinates(coords)
        if (route.waypoints && Array.isArray(route.waypoints) && route.waypoints.length > 0) {
          setMarkers(route.waypoints.map((p, i) => ({
            id: Date.now() + i,
            lngLat: [p[1], p[0]] // convert [lat,lng] to [lng,lat]
          })))
        } else {
          setMarkers(coords.filter((_, i) => i % 10 === 0).map((p, i) => ({
            id: Date.now() + i,
            lngLat: p
          })))
        }
        setSaveStatus('')

        // Fly to the route
        if (mapRef.current && coords.length > 0) {
          const bounds = coords.reduce(
            (b, coord) => {
              return {
                minLng: Math.min(b.minLng, coord[0]),
                maxLng: Math.max(b.maxLng, coord[0]),
                minLat: Math.min(b.minLat, coord[1]),
                maxLat: Math.max(b.maxLat, coord[1]),
              }
            },
            { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
          )
          mapRef.current.fitBounds(
            [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
            { padding: 60, duration: 1000 }
          )
        }
      }
    }
    window.addEventListener('load-route', onLoadRoute)
    return () => window.removeEventListener('load-route', onLoadRoute)
  }, [])

  const handleSave = async () => {
    setSaveStatus('')
    const token = localStorage.getItem('token')
    if (!token) { setSaveStatus('You must be logged in to save routes'); return }

    const payload = {
      name: saveName,
      coordinates: routeCoordinates,
      distance: totalDistance,
      waypoints: markers.map(m => [m.lngLat[1], m.lngLat[0]]) // convert back to [lat, lng] for API
    }

    try {
      const res = await fetch('http://localhost:3000/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMsg = data.message || 'Save failed'
        throw new Error(data.error ? `${errMsg}: ${data.error}` : errMsg)
      }
      setSaveStatus('Route saved successfully!')
      setShowSaveModal(false)
    } catch (err) {
      console.error('Save route error:', err)
      setSaveStatus(err.message || 'Error saving route')
    }
  }

  if (!position) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm font-medium">Locating you on the map...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <Button
          onClick={handleUndo}
          disabled={markers.length === 0}
          variant="secondary"
          size="sm"
          className="shadow-lg"
        >
          <Undo2 className="size-4" />
          Undo
        </Button>

        <Button
          onClick={() => {
            if (routeCoordinates.length < 2) {
              setSaveStatus('Add at least two markers to save a route')
              return
            }
            const token = localStorage.getItem('token')
            if (!token) {
              setSaveStatus('You must be logged in to save routes')
              return
            }
            setSaveName(`Run ${new Date().toLocaleString()}`)
            setShowSaveModal(true)
            setSaveStatus('')
          }}
          variant="default"
          size="sm"
          className="shadow-lg"
        >
          <Save className="size-4" />
          Save Route
        </Button>
      </div>

      {/* Route Info Panel */}
      <div className="absolute bottom-6 left-4 z-20">
        <Card className="shadow-xl border-border/50 w-52">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Route Info
              </span>
            </div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {totalDistance > 0 ? `${(totalDistance / 1000).toFixed(2)}` : '0.00'}
              <span className="text-sm font-medium text-muted-foreground ml-1">km</span>
            </div>
            {markers.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                <MapPin className="size-3 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {markers.length} waypoint{markers.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {saveStatus && (
              <div className={`mt-3 text-xs font-medium ${saveStatus.includes('success') ? 'text-green-600' : 'text-destructive'}`}>
                {saveStatus}
              </div>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Map */}
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border/50 shadow-sm m-1">
        <MapComponent
          ref={mapRef}
          center={position}
          zoom={15}
          className="w-full h-full"
        >
          <MapControls
            position="bottom-right"
            showZoom
            showCompass
            showLocate
          />

          <MapClickHandler
            onAddMarker={handleAddMarker}
          />

          {/* Route line */}
          {routeCoordinates.length >= 2 && (
            <MapRoute
              coordinates={routeCoordinates}
              color="#c06a20"
              width={4}
              opacity={0.85}
            />
          )}

          {/* Markers */}
          {markers.map((marker, index) => (
            <MapMarker
              key={marker.id}
              longitude={marker.lngLat[0]}
              latitude={marker.lngLat[1]}
              draggable
              onDragEnd={(lngLat) => handleDragEnd(marker.id, lngLat)}
              onClick={() => handleRemoveMarker(marker.id)}
            >
              <MarkerContent>
                <div className="relative group">
                  <div className="size-6 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center text-primary-foreground text-[10px] font-bold transition-transform group-hover:scale-110">
                    {index + 1}
                  </div>
                  {/* Remove button on hover */}
                  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="size-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="size-2" />
                    </div>
                  </div>
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <div className="text-center">
                  <div className="font-medium">Waypoint {index + 1}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Click to remove · Drag to move
                  </div>
                </div>
              </MarkerTooltip>
            </MapMarker>
          ))}

          {/* Photo Pins */}
          {photoPins.map((photo, index) => (
            <MapMarker
              key={photo._id || photo.key || index}
              longitude={photo.location.coordinates[0]}
              latitude={photo.location.coordinates[1]}
              onClick={() => setSelectedPhoto(selectedPhoto?._id === photo._id ? null : photo)}
            >
              <MarkerContent>
                <div className="relative group cursor-pointer">
                  <div className="size-8 rounded-lg bg-white border-2 border-primary shadow-lg overflow-hidden transition-transform group-hover:scale-110">
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary" />
                </div>
              </MarkerContent>
              <MarkerPopup>
                <div className="w-48">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Photo'}
                    className="w-full aspect-video object-cover rounded-md"
                  />
                  {photo.caption && (
                    <p className="mt-2 text-xs text-muted-foreground">{photo.caption}</p>
                  )}
                  {photo.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {photo.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}
        </MapComponent>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Route</DialogTitle>
            <DialogDescription>
              Give your route a name to save it for later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="routeName">Route name</Label>
              <Input
                id="routeName"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My morning run"
                className="h-10"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Ruler className="size-3.5" />
                {(totalDistance / 1000).toFixed(2)} km
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {markers.length} waypoints
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="size-4" />
              Save Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
