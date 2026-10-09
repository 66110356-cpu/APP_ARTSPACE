import { useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Artists from './pages/Artists'
import Profile from './pages/Profile'
import ArtworkDetail from './pages/ArtworkDetail'
import ArtistProfile from './pages/ArtistProfile'
import AddArtwork from './pages/AddArtwork'
import EditArtwork from './pages/EditArtwork'
import EditProfile from './pages/EditProfile'
import Login from './pages/Login'
import EmailConfirmed from './pages/EmailConfirmed'
import SavedArtworks from './pages/SavedArtworks'
import NavIcon from './components/NavIcon'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'

import './App.css'

function ProtectedRoute({ children }) {
  const { user, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return <div className="app-loading" role="status">Connecting to ArtSpace…</div>
  }

  return user
    ? children
    : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function MakerRoute({ children }) {
  const { user, activeMode } = useAuth()

  return user?.accountType === 'maker' && activeMode === 'maker'
    ? children
    : <Navigate to="/explore" replace />
}

function PeeperRoute({ children }) {
  const { activeMode } = useAuth()

  return activeMode === 'peeper'
    ? children
    : <Navigate to="/explore" replace />
}

function AppContent() {
  const { user, activeMode, authReady, authError, logout, switchMode } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')
  const modeDisplayName = activeMode === 'peeper'
    ? user?.peeperProfile?.displayName || user?.username
    : user?.profile?.name || user?.username

  if (!authReady) {
    return <div className="app-loading" role="status">Connecting to ArtSpace…</div>
  }

  return (
      <div className="app">

        <nav className="navbar">

          <Link to="/" className="logo">
            ARTSPACE
          </Link>

          {user && (
            <>
              <div className="nav-links">
                <NavLink to="/" end className="nav-item">
                  <NavIcon name="home" />
                  <span>Home</span>
                </NavLink>
                <NavLink to="/explore" className="nav-item">
                  <NavIcon name="explore" />
                  <span>Explore</span>
                </NavLink>
                <NavLink to="/artists" className="nav-item">
                  <NavIcon name="artists" />
                  <span>Artists</span>
                </NavLink>
                {activeMode === 'peeper' && (
                  <NavLink to="/saved" className="nav-item">
                    <NavIcon name="saved" />
                    <span>Saved</span>
                  </NavLink>
                )}
                <NavLink to="/profile#about" className="nav-item">
                  <NavIcon name="about" />
                  <span>About</span>
                </NavLink>
              </div>
              <div className="user-menu">
                <Link to="/profile" className="user-name">
                  {modeDisplayName}
                </Link>
                {user.accountType === 'maker' && (
                  <button
                    className="mode-switch-button"
                    type="button"
                    aria-label={activeMode === 'maker' ? 'Switch to Peeper mode' : 'Switch to Maker mode'}
                    title={activeMode === 'maker' ? 'Switch to Peeper mode' : 'Switch to Maker mode'}
                    onClick={() => {
                      switchMode()
                      navigate(activeMode === 'maker' ? '/explore' : '/profile')
                    }}
                  >
                    <NavIcon name={activeMode === 'maker' ? 'peeper' : 'maker'} />
                  </button>
                )}
                <button
                  className="logout-button"
                  onClick={() => {
                    setLogoutError('')
                    logout()
                      .then(() => navigate('/login', { replace: true, state: null }))
                      .catch((error) => setLogoutError(error.message || 'Could not sign out.'))
                  }}
                >
                  Logout
                </button>
                {logoutError && <p className="auth-global-error" role="alert">{logoutError}</p>}
              </div>
            </>
          )}

          {!user && (
            <span className="login-brand-caption">A space for creativity</span>
          )}

        </nav>


        {authError && user && (
          <p className="auth-global-error" role="alert">{authError}</p>
        )}

        <Routes>

          <Route
            path="/"
            element={<ProtectedRoute><Home /></ProtectedRoute>}
          />

          <Route
            path="/explore"
            element={<ProtectedRoute><Explore /></ProtectedRoute>}
          />

          <Route 
            path="/artists" 
            element={<ProtectedRoute><Artists /></ProtectedRoute>}
          />

          <Route
            path="/profile"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
          />

          <Route
            path="/artwork/:id"
            element={<ProtectedRoute><ArtworkDetail /></ProtectedRoute>}
          />

          <Route
            path="/saved"
            element={<ProtectedRoute><PeeperRoute><SavedArtworks /></PeeperRoute></ProtectedRoute>}
          />

          <Route 
            path="/artist/:artistName" 
            element={<ProtectedRoute><ArtistProfile /></ProtectedRoute>}
          />

          <Route
            path="/add-artwork"
            element={<ProtectedRoute><MakerRoute><AddArtwork /></MakerRoute></ProtectedRoute>}
          />

          <Route
            path="/edit-artwork/:id"
            element={<ProtectedRoute><MakerRoute><EditArtwork /></MakerRoute></ProtectedRoute>}
          />

          <Route
            path="/edit-profile"
            element={<ProtectedRoute><MakerRoute><EditProfile /></MakerRoute></ProtectedRoute>}
          />

          <Route
            path="/auth/confirmed"
            element={<EmailConfirmed />}
          />

          <Route
           path="/login"
           element={<Login />}
          />
        </Routes>

      </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App