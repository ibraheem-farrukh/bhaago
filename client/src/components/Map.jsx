import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function MapClickHandler({ isPlacingMarkers, onAddMarker }) {
  useMapEvents({
    click(e) {
      if (isPlacingMarkers) {
        onAddMarker([e.latlng.lat, e.latlng.lng])
      }
    },
  })
  return null
}

export default function Map() {
  const [position, setPosition] = useState(null)
  const [isPlacingMarkers, setIsPlacingMarkers] = useState(false)
  const [markers, setMarkers] = useState([])
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [totalDistance, setTotalDistance] = useState(0)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude])
        },
        (error) => {
          console.error('Error getting location:', error)
          // Fallback to London
          setPosition([51.505, -0.09])
        }
      )
    } else {
      // Fallback if geolocation not supported
      setPosition([51.505, -0.09])
    }
  }, [])

  useEffect(() => {
    const fetchRoute = async () => {
      if (markers.length === 0) {
        setRouteCoordinates([])
        setTotalDistance(0)
        return
      }

      const allPoints = [position, ...markers.map(m => m.position)]
      const coordinates = allPoints.map(p => `${p[1]},${p[0]}`).join(';')
      
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson`
        )
        const data = await response.json()
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]])
          setRouteCoordinates(coords)
          setTotalDistance(data.routes[0].distance)
        }
      } catch (error) {
        console.error('Error fetching route:', error)
        setRouteCoordinates(allPoints)
        setTotalDistance(0)
      }
    }

    fetchRoute()
  }, [markers, position])

  const handleAddMarker = (position) => {
    setMarkers([...markers, { id: Date.now(), position }])
  }

  const handleRemoveMarker = (markerId) => {
    setMarkers(markers.filter(m => m.id !== markerId))
  }

  const handleUndo = () => {
    if (markers.length > 0) {
      setMarkers(markers.slice(0, -1))
    }
  }

  const handleUpdateMarkerPosition = (markerId, newPosition) => {
    setMarkers(markers.map(m => 
      m.id === markerId ? { ...m, position: newPosition } : m
    ))
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [markers])

  if (!position) {
    return <div style={{ color: '#323232' }}>Loading map...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setIsPlacingMarkers(!isPlacingMarkers)}
          style={{
            padding: '10px 20px',
            backgroundColor: isPlacingMarkers ? '#FFB600' : '#323232',
            color: isPlacingMarkers ? '#323232' : '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {isPlacingMarkers ? 'Stop Placing Markers' : 'Start Placing Markers'}
        </button>
        <button
          onClick={handleUndo}
          disabled={markers.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: markers.length === 0 ? '#ccc' : '#323232',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: markers.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          Undo (Ctrl+Z)
        </button>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <MapContainer
          center={position}
          zoom={17}
          style={{ width: '800px', height: '600px', borderRadius: '8px', cursor: isPlacingMarkers ? 'crosshair' : 'grab' }}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>You are here</Popup>
        </Marker>
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={marker.position}
            draggable={true}
            eventHandlers={{
              contextmenu: (e) => {
                e.originalEvent.preventDefault()
                handleRemoveMarker(marker.id)
              },
              dragend: (e) => {
                const newPos = e.target.getLatLng()
                handleUpdateMarkerPosition(marker.id, [newPos.lat, newPos.lng])
              },
            }}
          >
            <Popup>Custom marker (Right-click to remove, drag to move)</Popup>
          </Marker>
        ))}
        {routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            color="#FFB600" 
            weight={3}
          />
        )}
        <MapClickHandler isPlacingMarkers={isPlacingMarkers} onAddMarker={handleAddMarker} />
      </MapContainer>
      <div style={{
        width: '200px',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#323232', fontSize: '1.2rem' }}>Route Info</h3>
        <div style={{ color: '#323232' }}>
          <strong>Total Distance:</strong>
          <div style={{ fontSize: '1.5rem', color: '#FFB600', marginTop: '8px' }}>
            {totalDistance > 0 ? `${(totalDistance / 1000).toFixed(2)} km` : '0 km'}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
