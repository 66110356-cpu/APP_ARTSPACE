import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import EmojiTextarea from '../components/EmojiTextarea'
import { readArtworkImage } from '../utils/imageUpload'
import { createArtwork } from '../services/artspaceService'

const ARTWORK_EVENT = 'artspace:artwork-published'

function AddArtwork() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Illustration')
  const [software, setSoftware] = useState('Procreate')
  const [image, setImage] = useState(null)
  const [commentsEnabled, setCommentsEnabled] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  async function handleImageChange(event) {
    const file = event.target.files[0]

    if (!file) return

    setImage(null)
    try {
      setImage(await readArtworkImage(file))
      setMessage('')
      setMessageType('')
    } catch (error) {
      setMessage(error.message || 'Could not process the selected image.')
      setMessageType('error')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!image) {
      setMessage('Please choose an artwork image before publishing.')
      setMessageType('error')
      return
    }

    let newArtwork
    try {
      newArtwork = await createArtwork({
        userId: user.id,
        artistName: user.profile.name,
        title: title.trim(),
        description,
        category,
        software,
        image,
        commentsEnabled
      })
      window.dispatchEvent(new CustomEvent(ARTWORK_EVENT, { detail: newArtwork }))
    } catch (error) {
      setMessage(error.message || 'Could not publish this artwork.')
      setMessageType('error')
      return
    }

    navigate('/profile', {
      state: { notice: 'Artwork published successfully.' }
    })
  }

  return (
    <section className="add-artwork-page">
      <div className="add-artwork-header">

        <Link
          to="/profile"
          className="back-button"
        >
          ← Back to Profile
        </Link>

        <p className="small-title">CREATE</p>

        <h1>Add New Artwork</h1>

        <p>
          Share your creative work with the ArtSpace community.
        </p>

      </div>

      <form
        className="artwork-form"
        onSubmit={handleSubmit}
      >

        <div className="form-section">
          <label>Artwork Image</label>

          <div className="upload-box">

            {image ? (
              <img
                src={image}
                alt="Artwork preview"
                className="image-preview"
              />
            ) : (
              <>
                <div className="upload-icon">+</div>

                <p>Upload your artwork</p>

                <span>
                  PNG, JPG or WEBP · up to 15 MB
                </span>
              </>
            )}

            <label className="upload-button">
              Choose Image

              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                hidden
              />
            </label>

          </div>
        </div>


        <div className="form-section">
          <label>Artwork Title</label>

          <input
            type="text"
            placeholder="e.g. Artwork title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            required
          />
        </div>


        <EmojiTextarea
          id="artwork-description"
          label="Description"
          placeholder="Tell us about your artwork..."
          value={description}
          onChange={setDescription}
          rows={6}
        />

        <label className="comment-setting">
          <input
            type="checkbox"
            checked={commentsEnabled}
            onChange={(event) => setCommentsEnabled(event.target.checked)}
          />
          <span>
            <strong>Allow comments</strong>
            <small>Viewers can leave comments on this artwork.</small>
          </span>
        </label>


        <div className="form-row">

          <div className="form-section">
            <label>Category</label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              <option>Illustration</option>
              <option>3D Art</option>
              <option>Character Design</option>
              <option>Graphic Design</option>
              <option>Photography</option>
            </select>
          </div>


          <div className="form-section">
            <label>Software</label>

            <select
              value={software}
              onChange={(event) =>
                setSoftware(event.target.value)
              }
            >
              <option>Procreate</option>
              <option>Photoshop</option>
              <option>Illustrator</option>
              <option>Blender</option>
              <option>Clip Studio Paint</option>
              <option>Other</option>
            </select>
          </div>

        </div>

        {message && (
          <p
            className={`form-message ${messageType}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}

        <div className="form-actions">

          <Link
            to="/profile"
            className="cancel-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="publish-button"
          >
            Publish Artwork →
          </button>

        </div>

      </form>
    </section>
  )
}

export default AddArtwork