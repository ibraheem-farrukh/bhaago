import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE = 'http://localhost:3000/api'

export default function PhotoUpload({ runId, onPhotoAdded, className }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    setError('')
    setUploading(true)
    setProgress(0)

    try {
      const token = localStorage.getItem('token')

      // 1. Get presigned URL
      const presignRes = await fetch(`${API_BASE}/runs/${runId}/photos/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      })

      if (!presignRes.ok) {
        const data = await presignRes.json()
        throw new Error(data.message || 'Failed to get upload URL')
      }

      const { uploadUrl, key, url } = await presignRes.json()
      setProgress(20)

      // 2. Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Upload to S3 failed')
      }
      setProgress(70)

      // 3. Confirm upload with backend
      const confirmRes = await fetch(`${API_BASE}/runs/${runId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, url }),
      })

      if (!confirmRes.ok) {
        const data = await confirmRes.json()
        throw new Error(data.message || 'Failed to confirm upload')
      }

      const photo = await confirmRes.json()
      setProgress(100)

      onPhotoAdded?.(photo)
      setPreview(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const cancelPreview = () => {
    setPreview(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {preview && !uploading ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={preview} alt="Preview" className="w-full h-32 object-cover" />
          <Button
            size="icon-sm"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={cancelPreview}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uploading... {progress}%
            </>
          ) : (
            <>
              <Camera className="size-4" />
              Add Photo
            </>
          )}
        </Button>
      )}

      {uploading && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
