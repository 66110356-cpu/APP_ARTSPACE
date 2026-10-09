import { useEffect, useState } from 'react'
import AuthContext from './AuthContextValue'
import { supabase, supabaseReady } from '../lib/supabase'
import {
  getCurrentProfile,
  updateProfile as saveProfile,
  updatePeeperProfile as savePeeperProfile
} from '../services/artspaceService'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [modeState, setModeState] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!supabaseReady) {
      const timer = window.setTimeout(() => {
        setAuthError(
          'Connect Supabase to enable shared accounts and artwork. Configure the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
        )
        setAuthReady(true)
      }, 0)
      return () => window.clearTimeout(timer)
    }

    let active = true

    async function applySession(session) {
      if (!session?.user) {
        if (active) {
          setUser(null)
          setModeState(null)
        }
        return
      }

      try {
        const profile = await getCurrentProfile(session.user.id)
        if (active) {
          setUser({ ...profile, email: session.user.email })
          setModeState((current) => current?.userId === profile.id
            ? current
            : { userId: profile.id, mode: profile.accountType })
          setAuthError('')
        }
      } catch (error) {
        if (active) {
          setUser(null)
          setModeState(null)
          setAuthError(`Could not load your ArtSpace account: ${error.message}`)
        }
      }
    }

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        return applySession(data.session)
      })
      .catch((error) => {
        if (active) setAuthError(`Could not restore your session: ${error.message}`)
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        window.setTimeout(() => {
          applySession(session)
        }, 0)
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function register({ email, username, password, artistName, accountType }) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedAccountType = accountType === 'peeper' ? 'peeper' : 'maker'
    const displayName = artistName?.trim() || ''

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !/^[a-z0-9_]{3,24}$/.test(normalizedUsername) ||
      password.length < 8 ||
      (normalizedAccountType === 'maker' && !displayName)
    ) {
      throw new Error(
        'Use a valid email, a username with 3–24 letters/numbers/underscores, and a password of at least 8 characters. Art Makers also need an artist name.'
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        data: {
          username: normalizedUsername,
          account_type: normalizedAccountType,
          artist_name: displayName || null
        }
      }
    })

    if (error) {
      if (error.code === '23505' || error.message.toLowerCase().includes('username')) {
        throw new Error('That username is already registered.')
      }
      if (error.message.toLowerCase().includes('database error saving new user')) {
        throw new Error(
          'Supabase account setup is out of date. In SQL Editor, run the latest ArtSpace migration, then register again.'
        )
      }
      throw error
    }

    if (!data.session) {
      return {
        pendingConfirmation: true,
        email: normalizedEmail,
        accountType: normalizedAccountType
      }
    }

    const profile = await getCurrentProfile(data.user.id)
    setUser({ ...profile, email: data.user.email })
    setModeState({ userId: profile.id, mode: profile.accountType })
    return { ...profile, email: data.user.email }
  }

  async function login({ email, password }) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before signing in.')
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email or password is incorrect. Check your email spelling and password.')
      }
      throw new Error(`Could not sign in: ${error.message}`)
    }

    const profile = await getCurrentProfile(data.user.id)
    setUser({ ...profile, email: data.user.email })
    setModeState({ userId: profile.id, mode: profile.accountType })
    return { ...profile, email: data.user.email }
  }

  async function resendSignupConfirmation(email) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase()
    })
    if (error) throw error
  }

  async function logout() {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setModeState(null)
  }

  function switchMode() {
    if (user?.accountType !== 'maker') {
      throw new Error('Only Art Maker accounts can switch between Maker and Peeper modes.')
    }
    setModeState((current) => ({
      userId: user.id,
      mode: current?.userId === user.id && current.mode === 'peeper' ? 'maker' : 'peeper'
    }))
  }

  async function updateProfile(profile) {
    if (!user) throw new Error('You must be logged in to edit your profile.')
    const updatedProfile = await saveProfile(user.id, profile)
    setUser((current) => ({ ...current, ...updatedProfile }))
    return updatedProfile
  }

  async function updatePeeperProfile(profile) {
    const currentMode = modeState?.userId === user?.id
      ? modeState.mode
      : user?.accountType
    if (!user || currentMode !== 'peeper') {
      throw new Error('Switch to Peeper mode to update your Peeper profile photo.')
    }
    const updatedProfile = await savePeeperProfile(
      user.id,
      profile,
      user.peeperProfile?.avatarPath
    )
    setUser((current) => ({ ...current, ...updatedProfile }))
    return updatedProfile
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        activeMode: user
          ? modeState?.userId === user.id ? modeState.mode : user.accountType
          : null,
        authReady,
        authError,
        register,
        login,
        resendSignupConfirmation,
        logout,
        switchMode,
        updateProfile,
        updatePeeperProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
