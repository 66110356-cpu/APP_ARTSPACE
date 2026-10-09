import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getArtistsWithStats } from '../services/artspaceService'
import { useRemoteData } from '../hooks/useRemoteData'

function Artists() {
  const [search, setSearch] = useState('')
  const { data: artists = [], error, loading, reload } = useRemoteData(getArtistsWithStats)
  const filteredArtists = useMemo(
    () => artists.filter((artist) =>
      artist.profile.name.toLowerCase().includes(search.trim().toLowerCase())
    ),
    [artists, search]
  )

  return (
    <section className="artists-page">
      <div className="artists-header">
        <p className="small-title">ART COMMUNITY</p>
        <h1>Artists</h1>
        <p>Discover Art Makers and explore their creative portfolios.</p>
      </div>
      <div className="artists-search">
        <input
          type="text"
          placeholder="Search artists..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="artists-result"><p>{filteredArtists.length} artists</p></div>

      {loading ? (
        <p className="feed-loading-state" role="status">Loading artists…</p>
      ) : error ? (
        <div className="no-artists" role="alert">
          <h3>Could not load artists</h3>
          <p>{error}</p>
          <button onClick={reload}>Try again</button>
        </div>
      ) : filteredArtists.length ? (
        <div className="artists-grid">
          {filteredArtists.map((artist) => {
            const name = artist.profile.name
            return (
              <Link
                key={artist.id}
                to={`/artist/${encodeURIComponent(artist.id)}`}
                className="artist-card"
              >
                <div className="artist-card-avatar">
                  {artist.profile.avatar ? (
                    <img src={artist.profile.avatar} alt={name} className="artist-avatar-image" />
                  ) : name.charAt(0).toUpperCase()}
                </div>
                <div className="artist-card-info">
                  <h2>{name}</h2>
                  <p className="artist-card-role">{artist.profile.role || 'Digital Artist'}</p>
                  <p className="artist-card-bio">{artist.profile.bio || 'Art Maker on ArtSpace.'}</p>
                  <div className="artist-card-stats">
                    <span>🎨 {artist.artworks.length} works</span>
                    <span>❤️ {artist.likes}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="no-artists">
          <div className="no-artists-icon">✦</div>
          <h3>{search ? 'No artists found' : 'No Art Makers yet'}</h3>
          <p>
            {search
              ? 'Try searching for another artist.'
              : 'Creator profiles will appear here when Art Makers join.'}
          </p>
        </div>
      )}
    </section>
  )
}

export default Artists
