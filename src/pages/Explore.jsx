import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getArtworks } from '../services/artspaceService'
import { useRemoteData } from '../hooks/useRemoteData'

function Explore() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const loadArtworks = useCallback(() => getArtworks({ from: 0, to: 999 }), [])
  const { data: artworks = [], error, loading, reload } = useRemoteData(loadArtworks)
  const filteredArtworks = useMemo(() => artworks.filter((artwork) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      artwork.title.toLowerCase().includes(query) ||
      artwork.artist.toLowerCase().includes(query)
    const matchesCategory =
      selectedCategory === 'All' || artwork.category === selectedCategory

    return matchesSearch && matchesCategory
  }), [artworks, search, selectedCategory])
  const categories = [
    'All',
    'Illustration',
    '3D Art',
    'Character Design',
    'Graphic Design',
    'Photography'
  ]

  return (
    <section className="explore-page">
      <div className="explore-header">
        <p className="small-title">COMMUNITY GALLERY</p>
        <h1>Explore Artworks</h1>
        <p>Discover creative works from artists around the world.</p>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search artworks or artists..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="categories">
        {categories.map((category) => (
          <button
            key={category}
            className={selectedCategory === category ? 'active-category' : ''}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="explore-result">
        <p>{filteredArtworks.length} artworks found</p>
      </div>

      {loading ? (
        <p className="feed-loading-state" role="status">Loading artworks…</p>
      ) : error ? (
        <div className="no-results" role="alert">
          <h3>Could not load artworks</h3>
          <p>{error}</p>
          <button onClick={reload}>Try again</button>
        </div>
      ) : filteredArtworks.length ? (
        <div className="explore-grid">
          {filteredArtworks.map((artwork) => (
            <Link
              to={`/artwork/${artwork.id}`}
              className="explore-card artwork-link"
              key={artwork.id}
            >
              {artwork.image ? (
                <img src={artwork.image} alt={artwork.title} className="explore-uploaded-image" />
              ) : (
                <div className="explore-image">✦</div>
              )}
              <h3>{artwork.title}</h3>
              <p>by {artwork.artist}</p>
              <span>{artwork.category}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <div className="no-results-icon">✦</div>
          <h3>{artworks.length ? 'No artworks found' : 'No artworks have been shared yet'}</h3>
          <p>
            {artworks.length
              ? 'Try searching for another artwork or category.'
              : 'When Art Makers upload their work, it will appear here.'}
          </p>
          {artworks.length > 0 && (
            <button
              onClick={() => {
                setSearch('')
                setSelectedCategory('All')
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default Explore
