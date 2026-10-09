import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getSavedArtworks, toggleSavedArtwork } from '../services/artspaceService'
import { useRemoteData } from '../hooks/useRemoteData'

function SavedArtworks() {
  const { user } = useAuth()
  const loadSavedArtworks = useCallback(() => getSavedArtworks(user.id), [user.id])
  const { data: savedArtworks = [], setData: setSavedArtworks, error, loading, reload } =
    useRemoteData(loadSavedArtworks)

  async function removeSaved(artwork) {
    try {
      await toggleSavedArtwork(artwork.id, user.id, true)
      setSavedArtworks((current) => current.filter((item) => item.id !== artwork.id))
    } catch (removeError) {
      console.error('Could not remove the saved artwork:', removeError)
      window.alert(removeError.message || 'Could not remove this saved artwork.')
    }
  }

  return (
    <section className="saved-artworks-page">
      <p className="small-title">YOUR COLLECTION</p>
      <h1>Saved Artworks</h1>
      <p className="saved-artworks-intro">Artworks you have bookmarked to revisit.</p>

      {loading ? (
        <p className="feed-loading-state" role="status">Loading your collection…</p>
      ) : error ? (
        <div className="no-results" role="alert">
          <h3>Could not load saved artworks</h3>
          <p>{error}</p>
          <button onClick={reload}>Try again</button>
        </div>
      ) : savedArtworks.length ? (
        <div className="explore-grid">
          {savedArtworks.map((artwork) => (
            <article className="explore-card saved-artwork-card" key={artwork.id}>
              <Link to={`/artwork/${artwork.id}`} className="artwork-link">
                {artwork.image ? (
                  <img src={artwork.image} alt={artwork.title} className="explore-uploaded-image" />
                ) : (
                  <div className="explore-image">✦</div>
                )}
                <h3>{artwork.title}</h3>
                <p>by {artwork.artist}</p>
                <span>{artwork.category}</span>
              </Link>
              <button className="remove-saved-button" onClick={() => removeSaved(artwork)}>
                Remove from saved
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-portfolio">
          <div className="empty-icon">♡</div>
          <h3>Your collection is empty</h3>
          <p>Save artworks you love and they will appear here.</p>
          <Link to="/explore" className="publish-button">Explore Artworks</Link>
        </div>
      )}
    </section>
  )
}

export default SavedArtworks
