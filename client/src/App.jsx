import { useState, useEffect } from 'react'
import Map from './components/Map'
import Auth from './components/Auth'
import SavedRoutesPanel from './components/SavedRoutesPanel'
import { Button } from '@/components/ui/button'
import {
  LogIn,
  LogOut,
  Route,
  User,
  X,
  Image,
} from 'lucide-react'

function App() {
  const [page, setPage] = useState('map')
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null
    } catch (e) {
      return null
    }
  })
  const [showSaved, setShowSaved] = useState(false)
  const [photoPins, setPhotoPins] = useState([]) // Photos to show on map

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user') {
        try {
          setUser(JSON.parse(e.newValue))
        } catch (err) {
          setUser(null)
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // ---------- Auth page ----------
  if (page === 'auth') {
    return (
      <Auth
        onAuthSuccess={(userData) => {
          setUser(userData)
          setPage('map')
        }}
        onBack={() => setPage('map')}
      />
    )
  }

  // ---------- Main map page ----------
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-card/80 backdrop-blur-sm z-30">
        {/* Left – brand */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <Route className="size-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">bhaago</h1>
        </div>

        {/* Right – account actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaved((s) => !s)}
                className="gap-1.5"
              >
                <Route className="size-4" />
                <span className="hidden sm:inline">Saved Routes</span>
              </Button>

              <div className="h-5 w-px bg-border/60" />

              <div className="flex items-center gap-1.5 px-2">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="size-3 text-primary" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {user.name}
                </span>
              </div>

              <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setPage('auth')}
              className="gap-1.5"
            >
              <LogIn className="size-4" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Map fills remaining space */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Map photoPins={photoPins} onClearPhotoPins={() => setPhotoPins([])} />

        {/* Photo pins indicator */}
        {photoPins.length > 0 && (
          <div className="absolute top-4 right-4 z-20">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 shadow-lg"
              onClick={() => setPhotoPins([])}
            >
              <Image className="size-4" />
              {photoPins.length} photo{photoPins.length !== 1 ? 's' : ''} on map
              <X className="size-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Saved routes sidebar */}
        {showSaved && (
          <div className="absolute inset-y-0 right-0 z-30 w-80 max-w-full shadow-xl border-l border-border/50 bg-card/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Saved Routes
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSaved(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <SavedRoutesPanel
              onClose={() => setShowSaved(false)}
              onShowPhotoPins={(photos) => {
                setPhotoPins(photos)
                setShowSaved(false)
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
