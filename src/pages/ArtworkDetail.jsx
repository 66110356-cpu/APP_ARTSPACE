import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  addComment,
  getArtwork,
  getArtworkInteractionState,
  getComments,
  toggleArtworkLike,
  toggleSavedArtwork
} from '../services/artspaceService'
import { useRemoteData } from '../hooks/useRemoteData'

function ArtworkDetail() {
  const { id } = useParams()
  const { user, activeMode } = useAuth()
  const isPeeper = activeMode === 'peeper'
  const loadArtwork = useCallback(async () => {
    const artwork = await getArtwork(id)
    if (!artwork) return null
    const [interaction, comments] = await Promise.all([
      getArtworkInteractionState(artwork.id, user.id),
      artwork.commentsEnabled ? getComments(artwork.id) : Promise.resolve([])
    ])
    return { artwork, interaction, comments }
  }, [id, user.id])
  const { data, setData, error, loading, reload } = useRemoteData(loadArtwork)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [actionError, setActionError] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  async function handleLike() {
    if (!data) return
    setActionError('')
    try {
      const likes = await toggleArtworkLike(id, user.id, data.interaction.liked)
      setData((current) => ({
        ...current,
        artwork: { ...current.artwork, likes },
        interaction: { ...current.interaction, liked: !current.interaction.liked }
      }))
    } catch (likeError) {
      setActionError(likeError.message || 'Could not update your like.')
    }
  }

  async function handleSave() {
    if (!data) return
    setActionError('')
    try {
      await toggleSavedArtwork(id, user.id, data.interaction.saved)
      setData((current) => ({
        ...current,
        interaction: { ...current.interaction, saved: !current.interaction.saved }
      }))
    } catch (saveError) {
      setActionError(saveError.message || 'Could not update your saved artworks.')
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault()
    const text = commentText.trim()
    if (!text || !data) return
    setSubmittingComment(true)
    setCommentError('')
    try {
      const comment = await addComment(id, user.id, text, null, activeMode)
      setData((current) => ({ ...current, comments: [...current.comments, comment] }))
      setCommentText('')
    } catch (submitError) {
      setCommentError(submitError.message || 'Could not post your comment.')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleReplySubmit(event, parentComment) {
    event.preventDefault()
    const text = replyText.trim()
    if (!text || !data) return
    setSubmittingReply(true)
    setReplyError('')
    try {
      const reply = await addComment(id, user.id, text, parentComment.id, activeMode)
      setData((current) => ({ ...current, comments: [...current.comments, reply] }))
      setReplyText('')
      setReplyingTo(null)
    } catch (submitError) {
      setReplyError(submitError.message || 'Could not post your reply.')
    } finally {
      setSubmittingReply(false)
    }
  }

  if (loading) {
    return <section className="artwork-detail"><p role="status">Loading artwork…</p></section>
  }
  if (error) {
    return (
      <section className="artwork-detail">
        <Link to="/explore" className="back-button">← Back to Explore</Link>
        <div className="not-found" role="alert">
          <h1>Could not load this artwork</h1>
          <p>{error}</p>
          <button onClick={reload}>Try again</button>
        </div>
      </section>
    )
  }
  if (!data) {
    return (
      <section className="artwork-detail">
        <Link to="/explore" className="back-button">← Back to Explore</Link>
        <div className="not-found">
          <h1>Artwork Not Found</h1>
          <p>This artwork may have been removed.</p>
        </div>
      </section>
    )
  }

  const { artwork, interaction, comments } = data
  const commentsEnabled = artwork.commentsEnabled !== false

  return (
    <section className="artwork-detail">
      <Link to="/explore" className="back-button">← Back to Explore</Link>

      <div className="detail-content">
        <div className="detail-image">
          {artwork.image ? (
            <img src={artwork.image} alt={artwork.title} className="detail-uploaded-image" />
          ) : (
            <div className="detail-symbol">✦</div>
          )}
        </div>

        <div className="detail-info">
          <p className="small-title">ARTWORK</p>
          <h1>{artwork.title}</h1>
          <p className="artist-name">
            by <Link to={`/artist/${encodeURIComponent(artwork.ownerId)}`}>{artwork.artist}</Link>
          </p>
          <div className="detail-category">{artwork.category}</div>
          <p className="detail-description">{artwork.description || 'No description provided.'}</p>
          {artwork.software && (
            <p className="detail-software">Created with: <strong>{artwork.software}</strong></p>
          )}
          <div className="detail-meta">
            <span>❤️ {artwork.likes} Likes</span>
            <span>{artwork.createdAt ? new Date(artwork.createdAt).getFullYear() : ''}</span>
          </div>

          <div className="artwork-detail-actions">
            <button
              className={interaction.liked ? 'like-button liked' : 'like-button'}
              onClick={handleLike}
              aria-pressed={interaction.liked}
            >
              {interaction.liked ? '♥ Liked' : '♡ Like Artwork'}
            </button>
            {isPeeper && (
              <button
                className={interaction.saved ? 'bookmark-button saved' : 'bookmark-button'}
                onClick={handleSave}
                aria-label={interaction.saved ? 'Remove from saved artworks' : 'Save artwork'}
                aria-pressed={interaction.saved}
              >
                <span aria-hidden="true">{interaction.saved ? '🔖' : '♧'}</span>
                {interaction.saved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
          {actionError && <p className="form-message error" role="alert">{actionError}</p>}
        </div>
      </div>

      {commentsEnabled && (
        <section className="artwork-comments" aria-labelledby="comments-title">
          <div className="section-heading">
            <div>
              <p className="small-title">COMMUNITY</p>
              <h2 id="comments-title">Comments ({comments.length})</h2>
            </div>
          </div>

          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <label htmlFor="new-comment">Join the conversation</label>
            <textarea
              id="new-comment"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Write a thoughtful comment..."
              rows={3}
              maxLength={1000}
              required
            />
            {commentError && <p className="form-message error" role="alert">{commentError}</p>}
            <button type="submit" className="publish-button" disabled={submittingComment}>
              {submittingComment ? 'Posting…' : 'Post Comment'}
            </button>
          </form>

          {comments.length ? (
            <div className="comment-list">
              {comments.filter((comment) => !comment.parentId).map((comment) => {
                const replies = comments.filter((reply) => reply.parentId === comment.id)
                const canReply = activeMode === 'maker' &&
                  artwork.ownerId === user.id &&
                  comment.authorId !== user.id
                return (
                  <article className="comment-item" key={comment.id}>
                    <strong>{comment.author}</strong>
                    <time dateTime={comment.createdAt}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </time>
                    <p>{comment.text}</p>
                    {canReply && (
                      <button
                        className="comment-reply-button"
                        onClick={() => {
                          setReplyingTo(replyingTo === comment.id ? null : comment.id)
                          setReplyText('')
                          setReplyError('')
                        }}
                      >
                        {replyingTo === comment.id ? 'Cancel reply' : 'Reply'}
                      </button>
                    )}
                    {replyingTo === comment.id && (
                      <form
                        className="comment-reply-form"
                        onSubmit={(event) => handleReplySubmit(event, comment)}
                      >
                        <label htmlFor={`reply-${comment.id}`}>Reply to {comment.author}</label>
                        <textarea
                          id={`reply-${comment.id}`}
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          rows={2}
                          maxLength={1000}
                          required
                        />
                        {replyError && <p className="form-message error" role="alert">{replyError}</p>}
                        <button type="submit" className="publish-button" disabled={submittingReply}>
                          {submittingReply ? 'Replying…' : 'Post Reply'}
                        </button>
                      </form>
                    )}
                    {replies.map((reply) => (
                      <div className="comment-reply" key={reply.id}>
                        <strong>{reply.author}</strong>
                        <time dateTime={reply.createdAt}>
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </time>
                        <p>{reply.text}</p>
                      </div>
                    ))}
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="no-comments">No comments yet. Start the conversation.</p>
          )}
        </section>
      )}
    </section>
  )
}

export default ArtworkDetail
