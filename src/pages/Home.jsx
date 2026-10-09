import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getArtworks,
  subscribeToNewArtworks
} from '../services/artspaceService'

const PAGE_SIZE = 12
const ARTWORK_EVENT = 'artspace:artwork-published'

function getArtType(artwork) {
  return artwork.category === '3D Art' ? '3d' : '2d'
}

function getArtTag(artwork) {
  return getArtType(artwork) === '3d' ? '3D Art' : '2D Illustration'
}

function ArtworkCard({ artwork, isNew = false }) {
  return (
    <Link
      to={`/artwork/${artwork.id}`}
      className={`home-artwork-card${isNew ? ' artwork-card-new' : ''}`}
    >
      <div className="home-artwork-media">
        {artwork.image ? (
          <img src={artwork.image} alt={artwork.title} className="home-artwork-image" />
        ) : (
          <div className="home-artwork-image artwork-image-placeholder">✦</div>
        )}
        <span className="artwork-micro-tag">{getArtTag(artwork)}</span>
      </div>
      <div className="home-artwork-info">
        <h3>{artwork.title}</h3>
        <p>by {artwork.artist}</p>
      </div>
    </Link>
  )
}

function Home() {
  const [artworks, setArtworks] = useState([])
  const [pendingArtworks, setPendingArtworks] = useState([])
  const [selectedTab, setSelectedTab] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [recentlyAddedIds, setRecentlyAddedIds] = useState([])
  const sentinelRef = useRef(null)
  const cursorRef = useRef(null)
  const requestIdRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  const loadFirstPage = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    cursorRef.current = null
    setIsLoading(true)
    setHasMore(false)
    setLoadError('')

    try {
      const page = await getArtworks({
        from: 0,
        to: PAGE_SIZE - 1,
        artType: selectedTab === 'all' ? undefined : selectedTab
      })
      if (requestId !== requestIdRef.current) return
      setArtworks(page)
      cursorRef.current = page.at(-1)?.createdAt || null
      setHasMore(page.length === PAGE_SIZE)
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setLoadError(error.message || 'Could not load the community gallery.')
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [selectedTab])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) loadFirstPage()
    })
    return () => {
      active = false
    }
  }, [loadFirstPage])

  const addPendingArtwork = useCallback((artwork) => {
    setPendingArtworks((current) => {
      if (current.some((item) => item.id === artwork.id)) return current
      return [artwork, ...current]
    })
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToNewArtworks(addPendingArtwork)
    const onLocalPublish = (event) => addPendingArtwork(event.detail)
    window.addEventListener(ARTWORK_EVENT, onLocalPublish)

    return () => {
      unsubscribe()
      window.removeEventListener(ARTWORK_EVENT, onLocalPublish)
    }
  }, [addPendingArtwork])

  const loadNextPage = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMoreRef.current || !cursorRef.current) return

    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    setLoadError('')

    try {
      const page = await getArtworks({
        before: cursorRef.current,
        to: PAGE_SIZE - 1,
        artType: selectedTab === 'all' ? undefined : selectedTab
      })
      setArtworks((current) => {
        const knownIds = new Set(current.map((artwork) => artwork.id))
        return [...current, ...page.filter((artwork) => !knownIds.has(artwork.id))]
      })
      cursorRef.current = page.at(-1)?.createdAt || cursorRef.current
      setHasMore(page.length === PAGE_SIZE)
    } catch (error) {
      setLoadError(error.message || 'Could not load more artworks.')
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoading, selectedTab])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || isLoading || isLoadingMore) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadNextPage()
      },
      { rootMargin: '500px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, loadNextPage])

  const visibleArtworks = useMemo(() => {
    const pendingIds = new Set(pendingArtworks.map((artwork) => artwork.id))
    return artworks.filter((artwork) => !pendingIds.has(artwork.id))
  }, [artworks, pendingArtworks])

  function revealNewArtworks() {
    const pendingIds = new Set(pendingArtworks.map((artwork) => artwork.id))
    setArtworks((current) => [
      ...pendingArtworks,
      ...current.filter((artwork) => !pendingIds.has(artwork.id))
    ])
    setRecentlyAddedIds(Array.from(pendingIds))
    setPendingArtworks([])
    setSelectedTab('all')
    window.setTimeout(() => setRecentlyAddedIds([]), 1200)
  }

  return (
    <main className="home-page artspace-feed-page">
      <section className="home-section community-feed" aria-labelledby="community-feed-title">
        <div className="section-heading">
          <div>
            <p className="small-title">COMMUNITY GALLERY</p>
            <h2 id="community-feed-title">Find your next inspiration</h2>
          </div>
        </div>

        <div className="feed-filter-tabs" role="tablist" aria-label="Filter artworks">
          {[
            { id: 'all', label: 'All Space' },
            { id: '2d', label: '2D Art' },
            { id: '3d', label: '3D Art' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selectedTab === tab.id}
              className={selectedTab === tab.id ? 'active' : ''}
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {pendingArtworks.length > 0 && (
          <button
            type="button"
            className="new-artworks-pill"
            onClick={revealNewArtworks}
          >
            ✨ {pendingArtworks.length} new artwork{pendingArtworks.length === 1 ? '' : 's'} added (Click to view)
          </button>
        )}

        {isLoading ? (
          <p className="feed-loading-state" role="status">Loading community artworks…</p>
        ) : loadError ? (
          <div className="no-results">
            <h3>Could not load artworks</h3>
            <p>{loadError}</p>
            <button onClick={loadFirstPage}>Try again</button>
          </div>
        ) : visibleArtworks.length ? (
          <div className="home-artwork-grid home-masonry-grid">
            {visibleArtworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                isNew={recentlyAddedIds.includes(artwork.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-portfolio feed-empty-state">
            <div className="empty-icon">✦</div>
            <h3>{artworks.length ? 'Nothing in this space yet' : 'The gallery is waiting for its first artwork'}</h3>
            <p>
              {artworks.length
                ? 'Try another filter to see more of the community gallery.'
                : 'Real Art Maker uploads will appear here and on the Explore page.'}
            </p>
          </div>
        )}

        <div ref={sentinelRef} className="feed-scroll-sentinel" aria-hidden="true" />
        {isLoadingMore && (
          <p className="feed-loading-state" role="status">Finding more inspiration…</p>
        )}
        {loadError && !isLoading && visibleArtworks.length > 0 && (
          <p className="feed-error" role="alert">{loadError}</p>
        )}
      </section>
    </main>
  )
}

export default Home
