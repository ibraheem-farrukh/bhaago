import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Trash2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lightbox overlay component
function Lightbox({ photos, initialIndex = 0, onClose, onDelete }) {
  const [index, setIndex] = useState(initialIndex)
  const photo = photos[index]

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goNext, goPrev])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="size-6" />
      </Button>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
          >
            <ChevronLeft className="size-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
          >
            <ChevronRight className="size-8" />
          </Button>
        </>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.url}
          alt={photo.caption || 'Photo'}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />

        {/* Footer info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="text-sm opacity-80">
                {index + 1} / {photos.length}
              </span>
              {photo.location?.coordinates && (
                <span className="flex items-center gap-1 text-xs opacity-60">
                  <MapPin className="size-3" />
                  Geotagged
                </span>
              )}
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                onClick={() => onDelete(photo)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
          {photo.caption && (
            <p className="mt-2 text-sm text-white/90">{photo.caption}</p>
          )}
          {photo.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-white/20 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Gallery grid component
export default function PhotoGallery({ photos, onDelete, className }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  if (!photos || photos.length === 0) {
    return null
  }

  return (
    <>
      <div className={cn('grid gap-1.5', className)}
        style={{
          gridTemplateColumns: photos.length === 1
            ? '1fr'
            : photos.length === 2
              ? 'repeat(2, 1fr)'
              : 'repeat(3, 1fr)'
        }}
      >
        {photos.slice(0, 6).map((photo, i) => (
          <button
            key={photo._id || photo.key || i}
            onClick={() => setLightboxIndex(i)}
            className={cn(
              'relative aspect-square rounded-md overflow-hidden group',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              // Make first photo bigger if odd count
              photos.length > 2 && i === 0 && 'row-span-2 col-span-2'
            )}
          >
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${i + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            
            {/* Show overflow count on last visible item */}
            {i === 5 && photos.length > 6 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  +{photos.length - 6}
                </span>
              </div>
            )}

            {/* Location indicator */}
            {photo.location?.coordinates && (
              <div className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <MapPin className="size-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={onDelete}
        />
      )}
    </>
  )
}
