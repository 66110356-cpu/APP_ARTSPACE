import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getArtistFollowers,
  getArtworks,
  getFollowState,
  getProfile,
  toggleFollow
} from '../services/artspaceService'
import { useRemoteData } from '../hooks/useRemoteData'

function ArtistProfile() {
  const { artistName: artistId } = useParams()
  const { user: currentUser } = useAuth()
  const [followersOpen, setFollowersOpen] = useState(false)
  const [followers, setFollowers] = useState([])
  const [followersLoading, setFollowersLoading] = useState(false)
  const [followersError, setFollowersError] = useState('')
  const loadArtist = useCallback(async () => {
    const artist = await getProfile(artistId)
    if (!artist || artist.accountType !== 'maker') return null
    const [artworks, follow] = await Promise.all([
      getArtworks({ from: 0, to: 999, ownerId: artistId }),
      getFollowState(artistId, currentUser.id)
    ])
    return { artist, artworks, follow }
  }, [artistId, currentUser.id])
  const { data, setData, error, loading, reload } = useRemoteData(loadArtist)

  async function handleFollow() {
    if (!data) return
    try {
      const follow = await toggleFollow(
        artistId,
        currentUser.id,
        data.follow.following
      )
      setData((current) => ({ ...current, follow }))
    } catch (followError) {
      window.alert(followError.message || 'Could not update your following list.')
    }
  }

  async function showFollowers() {
    setFollowersOpen(true)
    setFollowersLoading(true)
    setFollowersError('')
    try {
      setFollowers(await getArtistFollowers(artistId))
    } catch (followersLoadError) {
      setFollowersError(followersLoadError.message || 'Could not load followers.')
    } finally {
      setFollowersLoading(false)
    }
  }

  if (loading) {
    return <section className="artist-profile-page"><p role="status">Loading artist profile…</p></section>
  }

  if (error) {
    return (
      <section className="artist-profile-page">
        <Link to="/artists" className="back-button">← Back to Artists</Link>
        <div className="not-found" role="alert">
          <h1>Could not load this artist</h1>
          <p>{error}</p>
          <button onClick={reload}>Try again</button>
        </div>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="artist-profile-page">
        <Link to="/artists" className="back-button">← Back to Artists</Link>
        <div className="not-found">
          <h1>Artist Not Found</h1>
          <p>This artist profile is no longer available.</p>
        </div>
      </section>
    )
  }

  const { artist, artworks: artistArtworks, follow } = data
  const artistName = artist.profile.name
  const totalLikes = artistArtworks.reduce((total, artwork) => total + artwork.likes, 0)

  return (
    <section className="artist-profile-page">
      <Link to="/artists" className="back-button">← Back to Artists</Link>
      <div className="artist-profile-header">
        <div className="artist-avatar-large">
          {artist.profile.avatar ? (
            <img src={artist.profile.avatar} alt={artistName} className="artist-avatar-large-image" />
          ) : artistName.charAt(0).toUpperCase()}
        </div>
        <div className="artist-profile-info">
          <p className="small-title">ARTIST PROFILE</p>
          <h1>{artistName}</h1>
          <p className="artist-role">{artist.profile.role}</p>
          <p className="artist-bio">{artist.profile.bio}</p>
          {currentUser.id === artist.id ? (
            <Link to="/edit-profile" className="edit-profile-button">Edit Profile</Link>
          ) : (
            <button
              className={follow.following ? 'follow-button following' : 'follow-button'}
              onClick={handleFollow}
            >
              {follow.following ? '♥ Following' : '♡ Follow'}
            </button>
          )}
          <div className="artist-stats">
            <div><strong>{artistArtworks.length}</strong><span>Artworks</span></div>
            <div><strong>{totalLikes}</strong><span>Likes</span></div>
            <button className="artist-stat-button" onClick={showFollowers}>
              <strong>{follow.followers}</strong><span>Followers</span>
            </button>
          </div>
        </div>

        {followersOpen && (
          <div className="profile-dialog-backdrop" onClick={() => setFollowersOpen(false)}>
            <section
              className="profile-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="followers-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="profile-dialog-close"
                aria-label="Close followers"
                onClick={() => setFollowersOpen(false)}
              >
                ×
              </button>
              <h2 id="followers-dialog-title">Followers</h2>
              {followersLoading ? (
                <p role="status">Loading followers…</p>
              ) : followersError ? (
                <div className="profile-dialog-error" role="alert">
                  <p>{followersError}</p>
                  <button onClick={showFollowers}>Try again</button>
                </div>
              ) : followers.length ? (
                <ul className="follow-profile-list">
                  {followers.map((follower) => (
                    <li key={follower.id}>
                      {follower.accountType === 'maker' ? (
                        <Link
                          to={`/artist/${encodeURIComponent(follower.id)}`}
                          onClick={() => setFollowersOpen(false)}
                        >
                          <span className="follow-profile-avatar">
                            {follower.profile?.avatar ? (
                              <img src={follower.profile.avatar} alt="" />
                            ) : (follower.profile?.name || follower.username).charAt(0).toUpperCase()}
                          </span>
                          <span>{follower.profile?.name || follower.username}</span>
                        </Link>
                      ) : (
                        <div className="follow-profile-list-user">
                        <span className="follow-profile-avatar">
                          {follower.profile?.avatar ? (
                            <img src={follower.profile.avatar} alt="" />
                          ) : (follower.profile?.name || follower.username).charAt(0).toUpperCase()}
                        </span>
                        <span>{follower.profile?.name || follower.username}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="follow-list-empty">No followers yet.</p>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="artist-profile-line" />
      <div className="section-heading">
        <div>
          <p className="small-title">PORTFOLIO</p>
          <h2>{artistName}'s Works</h2>
        </div>
      </div>

      {artistArtworks.length ? (
        <div className="artist-portfolio-grid">
          {artistArtworks.map((artwork) => (
            <Link
              to={`/artwork/${artwork.id}`}
              className="artist-work-card"
              key={artwork.id}
            >
              {artwork.image ? (
                <img src={artwork.image} alt={artwork.title} className="artist-work-image" />
              ) : (
                <div className="artist-work-image">✦</div>
              )}
              <div className="artist-work-info">
                <h3>{artwork.title}</h3>
                <p>{artwork.category}</p>
                <span>❤️ {artwork.likes}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-portfolio">
          <div className="empty-icon">✦</div>
          <h3>No artworks yet</h3>
          <p>This artist hasn't published any artworks yet.</p>
        </div>
      )}
    </section>
  )
}

export default ArtistProfile
