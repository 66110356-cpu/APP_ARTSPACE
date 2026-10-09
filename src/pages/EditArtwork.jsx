import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import EmojiTextarea from '../components/EmojiTextarea'
import { readArtworkImage } from '../utils/imageUpload'
import { getArtwork, updateArtwork } from '../services/artspaceService'
import { useRemoteData } from '../hooks/useRemoteData'

function EditArtwork() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const loadArtwork = useCallback(async () => {
    const artwork = await getArtwork(id)
    return artwork?.ownerId === user.id ? artwork : null
  }, [id, user.id])
  const { data: artwork, error, loading } = useRemoteData(loadArtwork)
  const [formValues, setFormValues] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const values = formValues?.artworkId === artwork?.id ? formValues : {
    artworkId: artwork?.id,
    title: artwork?.title || '',
    description: artwork?.description || '',
    category: artwork?.category || 'Illustration',
    software: artwork?.software || 'Procreate',
    image: artwork?.image || '',
    imageChanged: false,
    commentsEnabled: artwork?.commentsEnabled !== false
  }
  function updateValue(field, value) {
    setFormValues((current) => ({
      ...values,
      ...current,
      artworkId: artwork?.id,
      [field]: value
    }))
  }

  async function handleImageChange(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      updateValue('image', await readArtworkImage(file))
      updateValue('imageChanged', true)
      setMessage('')
    } catch (imageError) {
      setMessage(imageError.message || 'Could not process the selected image.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await updateArtwork(id, user.id, {
        title: values.title.trim(),
        description: values.description,
        category: values.category,
        software: values.software,
        image: values.imageChanged ? values.image : null,
        previousImagePath: artwork.imagePath,
        commentsEnabled: values.commentsEnabled
      })
      navigate('/profile')
    } catch (saveError) {
      setMessage(saveError.message || 'Could not save the changes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <section className="add-artwork-page"><p role="status">Loading artwork…</p></section>
  if (error) {
    return (
      <section className="add-artwork-page">
        <p className="form-message error" role="alert">{error}</p>
        <Link to="/profile">← Back to Profile</Link>
      </section>
    )
  }
  if (!artwork) {
    return (
      <section className="add-artwork-page">
        <h1>Artwork not found</h1>
        <Link to="/profile">← Back to Profile</Link>
      </section>
    )
  }

  return (
    <section className="add-artwork-page">
      <div className="add-artwork-header">
        <Link to="/profile" className="back-button">← Back to Profile</Link>
        <p className="small-title">EDIT</p>
        <h1>Edit Artwork</h1>
        <p>Update the information of your artwork.</p>
      </div>

      <form className="artwork-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <label>Artwork Image</label>
          <div className="upload-box">
            <img src={values.image} alt={artwork.title} className="image-preview" />
            <label className="choose-picture-button">
              Choose New Image
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
          <label htmlFor="artwork-title">Artwork Title</label>
          <input
            id="artwork-title"
            type="text"
            value={values.title}
            onChange={(event) => updateValue('title', event.target.value)}
            maxLength={160}
            required
          />
        </div>

        <EmojiTextarea
          id="artwork-description"
          label="Description"
          value={values.description}
          onChange={(value) => updateValue('description', value)}
          rows={6}
        />

        <label className="comment-setting">
          <input
            type="checkbox"
            checked={values.commentsEnabled}
            onChange={(event) => updateValue('commentsEnabled', event.target.checked)}
          />
          <span>
            <strong>Allow comments</strong>
            <small>Viewers can leave comments on this artwork.</small>
          </span>
        </label>

        <div className="form-row">
          <div className="form-section">
            <label htmlFor="artwork-category">Category</label>
            <select id="artwork-category" value={values.category} onChange={(event) => updateValue('category', event.target.value)}>
              <option>Illustration</option>
              <option>3D Art</option>
              <option>Character Design</option>
              <option>Graphic Design</option>
              <option>Photography</option>
            </select>
          </div>
          <div className="form-section">
            <label htmlFor="artwork-software">Software</label>
            <select id="artwork-software" value={values.software} onChange={(event) => updateValue('software', event.target.value)}>
              <option>Procreate</option>
              <option>Photoshop</option>
              <option>Illustrator</option>
              <option>Blender</option>
              <option>Clip Studio Paint</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        {message && <p className="form-message error" role="alert">{message}</p>}

        <div className="form-actions">
          <Link to="/profile" className="cancel-button">Cancel</Link>
          <button type="submit" className="publish-button" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes →'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default EditArtwork
