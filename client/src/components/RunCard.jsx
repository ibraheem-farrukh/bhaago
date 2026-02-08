import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PhotoGallery from './PhotoGallery'
import PhotoUpload from './PhotoUpload'
import {
  Calendar,
  Clock,
  Flame,
  Gauge,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Image,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE = 'http://localhost:3000/api'

function formatDuration(seconds) {
  if (!seconds) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPace(minPerKm) {
  if (!minPerKm) return '--:--'
  const m = Math.floor(minPerKm)
  const s = Math.round((minPerKm - m) * 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function RunCard({ run, onDelete, onUpdate, showPhotoPins }) {
  const [expanded, setExpanded] = useState(false)
  const [photos, setPhotos] = useState(run.photos || [])
  const [showUpload, setShowUpload] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handlePhotoAdded = (photo) => {
    setPhotos((prev) => [...prev, photo])
    setShowUpload(false)
    onUpdate?.({ ...run, photos: [...photos, photo] })
  }

  const handleDeletePhoto = async (photo) => {
    if (!confirm('Delete this photo?')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/runs/${run._id}/photos/${photo._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete photo')
      
      setPhotos((prev) => prev.filter((p) => p._id !== photo._id))
      onUpdate?.({ ...run, photos: photos.filter((p) => p._id !== photo._id) })
    } catch (err) {
      console.error('Delete photo error:', err)
      alert(err.message)
    }
  }

  const handleDeleteRun = async () => {
    if (!confirm('Delete this run and all its photos?')) return
    setDeleting(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/runs/${run._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete run')
      onDelete?.(run._id)
    } catch (err) {
      console.error('Delete run error:', err)
      alert(err.message)
      setDeleting(false)
    }
  }

  const hasPhotos = photos.length > 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-left focus:outline-none group"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              {new Date(run.date).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="mt-1 font-medium text-sm truncate group-hover:text-primary transition-colors">
              {run.name || 'Untitled Run'}
            </div>
          </button>

          <div className="flex items-center gap-1">
            {hasPhotos && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground px-1.5">
                <Image className="size-3" />
                {photos.length}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          {run.distance && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">
                {(run.distance / 1000).toFixed(2)} km
              </span>
            </div>
          )}
          {run.duration && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3" />
              {formatDuration(run.duration)}
            </div>
          )}
          {run.avgPace && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Gauge className="size-3" />
              {formatPace(run.avgPace)}/km
            </div>
          )}
          {run.calories && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Flame className="size-3" />
              {run.calories}
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
            {/* Notes */}
            {run.notes && (
              <p className="text-xs text-muted-foreground">{run.notes}</p>
            )}

            {/* Photo Gallery */}
            {hasPhotos && (
              <PhotoGallery
                photos={photos}
                onDelete={handleDeletePhoto}
              />
            )}

            {/* Upload button / form */}
            {showUpload ? (
              <div className="space-y-2">
                <PhotoUpload
                  runId={run._id}
                  onPhotoAdded={handlePhotoAdded}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => setShowUpload(true)}
              >
                <Plus className="size-3" />
                Add Photo
              </Button>
            )}

            {/* Show on map button */}
            {hasPhotos && photos.some(p => p.location?.coordinates) && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => showPhotoPins?.(photos.filter(p => p.location?.coordinates))}
              >
                <Image className="size-3" />
                Show Photos on Map
              </Button>
            )}

            {/* Delete run */}
            <div className="pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteRun}
                disabled={deleting}
              >
                <Trash2 className="size-3 mr-1.5" />
                {deleting ? 'Deleting...' : 'Delete Run'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
