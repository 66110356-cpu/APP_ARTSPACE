import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authReady, authError, login, register, resendSignupConfirmation } = useAuth()
  const [mode, setMode] = useState('login')
  const [accountType, setAccountType] = useState('maker')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [artistName, setArtistName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && authReady) {
      const defaultDestination =
        user.accountType === 'peeper' ? '/' : '/profile'
      const requestedDestination = location.state?.from
      const isMakerPath =
        requestedDestination === '/profile' ||
        requestedDestination?.startsWith('/edit-profile') ||
        requestedDestination?.startsWith('/edit-artwork') ||
        requestedDestination === '/add-artwork'
      const destination =
        user.accountType === 'peeper' && isMakerPath
          ? defaultDestination
          : requestedDestination || defaultDestination

      navigate(destination, { replace: true })
    }
  }, [user, authReady, navigate, location.state])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('error')
    setConfirmationEmail('')

    if (mode === 'register' && password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      let authenticatedUser
      if (mode === 'register') {
        authenticatedUser = await register({
          email,
          username,
          password,
          accountType,
          artistName: accountType === 'maker' ? artistName : ''
        })
      } else {
        authenticatedUser = await login({ email, password })
      }
      if (authenticatedUser.pendingConfirmation) {
        setConfirmationEmail(authenticatedUser.email)
        setMessage('Your account was created and Supabase accepted the verification email request.')
        setMessageType('success')
        setMode('login')
        setPassword('')
        return
      }
      const defaultDestination =
        authenticatedUser.accountType === 'peeper' ? '/' : '/profile'
      navigate(
        mode === 'login' ? location.state?.from || defaultDestination : defaultDestination,
        { replace: true, state: null }
      )
    } catch (error) {
      setMessage(error.message || 'Could not complete your request. Please try again.')
      if (error.message?.includes('confirm your email')) {
        setConfirmationEmail(email.trim())
        setMessage('Your account is waiting for email verification. Open the link we sent before signing in.')
        setMessageType('success')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendConfirmation() {
    setIsSubmitting(true)
    setMessage('')
    try {
      await resendSignupConfirmation(confirmationEmail)
      setMessage(`Supabase accepted a new verification email request for ${confirmationEmail}.`)
      setMessageType('success')
    } catch (error) {
      setMessage(error.message || 'Could not resend the confirmation email.')
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!authReady) {
    return (
      <section className="login-page">
        <div className="login-card">
          <img className="login-brand-icon" src="/app-icon-192.png" alt="" />
          <p className="small-title">ARTSPACE</p>
          <h1>Connecting securely…</h1>
        </div>
      </section>
    )
  }

  if (user) return null

  return (
    <section className="login-page">
      <div className="login-card">
        <img className="login-brand-icon" src="/app-icon-192.png" alt="" />
        <p className="small-title">WELCOME TO ARTSPACE</p>
        <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="login-description">
          {mode === 'login'
            ? 'Sign in to continue to your ArtSpace.'
            : 'Choose how you want to join the ArtSpace community.'}
        </p>

        {authError && (
          <p className="form-message error" role="alert">{authError}</p>
        )}

        <div className="auth-mode-switch">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login')
              setMessage('')
              setMessageType('error')
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register')
              setMessage('')
              setMessageType('error')
              setConfirmationEmail('')
            }}
          >
            Create account
          </button>
        </div>

        {mode === 'register' && (
          <div className="account-type-options" aria-label="Choose account type">
            <button
              type="button"
              className={`account-type-card ${accountType === 'peeper' ? 'active' : ''}`}
              aria-pressed={accountType === 'peeper'}
              onClick={() => {
                setAccountType('peeper')
                setMessage('')
              }}
            >
              <span className="account-type-icon" aria-hidden="true">◉</span>
              <span className="account-type-name">Art Peeper</span>
              <span className="account-type-description">
                Discover artwork and follow artists.
              </span>
            </button>
            <button
              type="button"
              className={`account-type-card ${accountType === 'maker' ? 'active' : ''}`}
              aria-pressed={accountType === 'maker'}
              onClick={() => {
                setAccountType('maker')
                setMessage('')
              }}
            >
              <span className="account-type-icon" aria-hidden="true">✦</span>
              <span className="account-type-name">Art Maker</span>
              <span className="account-type-description">
                Create a profile and share your artwork.
              </span>
            </button>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-section">
              <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              minLength="3"
              required
            />
            </div>
          )}

          <div className="form-section">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {mode === 'register' && accountType === 'maker' && (
            <div className="form-section">
              <label htmlFor="artist-name">Artist Name</label>
              <input
                id="artist-name"
                type="text"
                placeholder="Name shown on your profile"
                value={artistName}
                onChange={(event) => setArtistName(event.target.value)}
                required
              />
            </div>
          )}

          <div className="form-section">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
          </div>

          {confirmationEmail && mode === 'login' && (
            <div
              className={`email-verification-notice ${messageType}`}
              role={messageType === 'error' ? 'alert' : 'status'}
              aria-live={messageType === 'error' ? 'assertive' : 'polite'}
            >
              <span className="email-verification-icon" aria-hidden="true">✉</span>
              <div>
                <h2>Check your email to verify your account</h2>
                <p>{message || 'Your account needs email verification before you can sign in.'}</p>
                <strong className="email-verification-address">{confirmationEmail}</strong>
                <p className="email-verification-help">
                  Open the verification link in the email, then return here to sign in.
                  If it is not in your inbox, check your spam or junk folder.
                </p>
                <p className="email-verification-limit">
                  Supabase&apos;s built-in email service is for testing only: it sends to
                  project team email addresses and is limited to 2 emails per hour.
                  A successful request does not guarantee delivery to other addresses.
                </p>
                <button
                  type="button"
                  className="email-verification-resend"
                  onClick={handleResendConfirmation}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            </div>
          )}
          {message && !confirmationEmail && (
            <p
              className={`form-message ${messageType}`}
              role={messageType === 'error' ? 'alert' : 'status'}
              aria-live={messageType === 'error' ? 'assertive' : 'polite'}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="publish-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Login →'
                : 'Create Account →'}
          </button>
        </form>
        {mode === 'register' && accountType === 'peeper' && (
          <p className="account-type-note">
            Art Peeper account details and profile options can be expanded later.
          </p>
        )}
      </div>
    </section>
  )
}

export default Login
