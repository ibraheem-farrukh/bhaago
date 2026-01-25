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
        }
      } catch (error) {
        console.error('Error fetching route:', error)
        setRouteCoordinates(allPoints)
      }
    }

    fetchRoute()
  }, [markers, position])

  const handleAddMarker = (position) => {
    setMarkers([...markers, { id: Date.now(), position }])
  }

  if (!position) {
    return <div style={{ color: '#323232' }}>Loading map...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
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
          <Marker key={marker.id} position={marker.position}>
            <Popup>Custom marker</Popup>
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
    </div>
  )
}
