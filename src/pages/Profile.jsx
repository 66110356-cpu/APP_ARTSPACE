import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { readArtworkImage } from '../utils/imageUpload'
import {
  deleteArtwork,
  getArtworks,
  getFollowedArtists,
  toggleFollow
} from '../services/artspaceService'
import { useRemoteData } from '../hooks/useRemoteData'

function Profile() {
  const { user, activeMode, updatePeeperProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const notice = location.state?.notice
  const [avatarDraft, setAvatarDraft] = useState('')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [displayName, setDisplayName] = useState(
    user.peeperProfile?.displayName || user.username
  )
  const [displayNameDraft, setDisplayNameDraft] = useState(
    user.peeperProfile?.displayName || user.username
  )
  const isPeeper = activeMode === 'peeper'
  const loadProfileData = useCallback(
    () => isPeeper
      ? getFollowedArtists(user.id)
      : getArtworks({ from: 0, to: 999, ownerId: user.id }),
    [isPeeper, user.id]
  )
  const { data: profileData = [], setData: setProfileData, error, loading, reload } =
    useRemoteData(loadProfileData)
  const [actionError, setActionError] = useState('')

  if (isPeeper) {
    async function handleAvatarChange(event) {
      const file = event.target.files?.[0]
      if (!file) return
      setAvatarError('')
      setAvatarMessage('')
      try {
        setAvatarDraft(await readArtworkImage(file))
      } catch (error) {
        setAvatarError(error.message || 'Could not process this image.')
      }
      event.target.value = ''
    }

    async function handleProfileSave() {
      const normalizedName = displayNameDraft.trim()
      if (!normalizedName || normalizedName.length > 40) {
        setAvatarError('Peeper display name must be between 1 and 40 characters.')
        return
      }
      if (!avatarDraft && normalizedName === displayName) return
      setAvatarSaving(true)
      setAvatarError('')
      setAvatarMessage('')
      try {
        await updatePeeperProfile({
          displayName: normalizedName,
          avatar: avatarDraft
        })
        setAvatarDraft('')
        setDisplayName(normalizedName)
        setAvatarMessage('Peeper profile updated.')
      } catch (error) {
        setAvatarError(error.message || 'Could not update your Peeper profile.')
      } finally {
        setAvatarSaving(false)
      }
    }

    async function handleUnfollow(artistId) {
      setActionError('')
      try {
        await toggleFollow(artistId, user.id, true)
        setProfileData((current) => current.filter((artist) => artist.id !== artistId))
      } catch (unfollowError) {
        setActionError(unfollowError.message || 'Could not update your following list.')
      }
    }

    return (
      <section className="profile-page peeper-profile-page" id="about">
        <div className="profile-header">
          <div className="profile-avatar">
            {(avatarDraft || user.peeperProfile?.avatar) ? (
              <img src={avatarDraft || user.peeperProfile.avatar} alt={`${displayName} profile`} />
            ) : user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="small-title">ART PEEPER</p>
            <h1>{displayName}</h1>
            <p>About</p>
            {isPeeper && (
              <div className="peeper-avatar-actions">
                <label className="edit-profile-button peeper-avatar-select">
                  Choose Photo
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleAvatarChange}
                    hidden
                  />
                </label>
                <label className="peeper-display-name-label" htmlFor="peeper-display-name">
                  Display name
                </label>
                <input
                  id="peeper-display-name"
                  className="peeper-display-name-input"
                  type="text"
                  value={displayNameDraft}
                  onChange={(event) => setDisplayNameDraft(event.target.value)}
                  maxLength={40}
                  required
                />
                {(avatarDraft || displayNameDraft.trim() !== displayName) && (
                  <button
                    type="button"
                    className="publish-button peeper-avatar-save"
                    onClick={handleProfileSave}
                    disabled={avatarSaving}
                  >
                    {avatarSaving ? 'Saving…' : 'Save Peeper Profile'}
                  </button>
                )}
              </div>
            )}
            {avatarError && <p className="form-message error" role="alert">{avatarError}</p>}
            {avatarMessage && <p className="profile-notice" role="status">{avatarMessage}</p>}
          </div>
        </div>

        <div className="section-heading following-heading">
          <div>
            <p className="small-title">YOUR COMMUNITY</p>
            <h2>Artists You Follow</h2>
          </div>
          <span>{profileData.length} following</span>
        </div>
        {actionError && <p className="form-message error" role="alert">{actionError}</p>}

        {loading ? (
          <p className="feed-loading-state" role="status">Loading artists you follow…</p>
        ) : error ? (
          <div className="no-results" role="alert">
            <h3>Could not load your following list</h3>
            <p>{error}</p>
            <button onClick={reload}>Try again</button>
          </div>
        ) : profileData.length ? (
          <div className="followed-artists-grid">
            {profileData.map((artist) => (
              <article className="followed-artist-card" key={artist.id}>
                <Link to={`/artist/${encodeURIComponent(artist.id)}`}>
                  <span className="follow-profile-avatar">
                    {artist.profile.avatar ? (
                      <img src={artist.profile.avatar} alt="" />
                    ) : artist.profile.name.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <strong>{artist.profile.name}</strong>
                    <small>{artist.profile.role}</small>
                  </span>
                </Link>
                <button onClick={() => handleUnfollow(artist.id)}>Following</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-portfolio">
            <div className="empty-icon">♡</div>
            <h3>You are not following any artists yet</h3>
            <p>Visit an artist profile and select Follow to see them here.</p>
            <Link to="/artists" className="publish-button">Discover Artists</Link>
          </div>
        )}
      </section>
    )
  }

  const profile = user.profile
  const artworks = profileData

  async function handleDelete(artwork) {
    const confirmed = window.confirm('Are you sure you want to delete this artwork?')
    if (!confirmed) return

    setActionError('')
    try {
      await deleteArtwork(artwork)
      setArtworks((current) => current.filter((item) => item.id !== artwork.id))
    } catch (deleteError) {
      setActionError(deleteError.message || 'Could not delete this artwork.')
    }
  }

  function handleEdit(id) {
    navigate(`/edit-artwork/${id}`)
  }

  return (
    <section className="profile-page" id="about">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="small-title">ARTIST PROFILE</p>
          <h1>{profile.name}</h1>
          <p>{profile.role}</p>
          <p className="profile-bio">{profile.bio}</p>
          <Link to="/edit-profile" className="edit-profile-button">Edit Profile</Link>
        </div>
      </div>

      {notice && (
        <p className="profile-notice" role="status" aria-live="polite">{notice}</p>
      )}
      {actionError && <p className="form-message error" role="alert">{actionError}</p>}

      <div className="section-heading">
        <div>
          <p className="small-title">PORTFOLIO</p>
          <h2>{profile.name}'s Works</h2>
        </div>
        <Link to="/add-artwork" className="add-artwork-button">+ Add Artwork</Link>
      </div>

      {loading ? (
        <p className="feed-loading-state" role="status">Loading your portfolio…</p>
      ) : error ? (
        <div className="no-results" role="alert">
          <h3>Could not load your artworks</h3>
          <p>{error}</p>
          <button onClick={reload}>Try again</button>
        </div>
      ) : artworks.length === 0 ? (
        <div className="empty-portfolio">
          <div className="empty-icon">✦</div>
          <h3>No artworks yet</h3>
          <p>Start building your portfolio by adding your first artwork.</p>
          <Link to="/add-artwork" className="publish-button">+ Add Your First Artwork</Link>
        </div>
      ) : (
        <div className="user-artwork-grid">
          {artworks.map((artwork) => (
            <div className="user-artwork" key={artwork.id}>
              <img src={artwork.image} alt={artwork.title} />
              <h3>{artwork.title}</h3>
              <p>{artwork.category}</p>
              <div className="artwork-actions">
                <button className="edit-button" onClick={() => handleEdit(artwork.id)}>Edit</button>
                <button className="delete-button" onClick={() => handleDelete(artwork)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default Profile
