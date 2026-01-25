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
        {markers.length > 1 && (
          <Polyline 
            positions={markers.map(m => m.position)} 
            color="#FFB600" 
            weight={3}
          />
        )}
        <MapClickHandler isPlacingMarkers={isPlacingMarkers} onAddMarker={handleAddMarker} />
      </MapContainer>
    </div>
  )
}
