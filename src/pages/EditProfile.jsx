import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import EmojiTextarea from '../components/EmojiTextarea'
import { readArtworkImage } from '../utils/imageUpload'

function EditProfile() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const savedProfile = user.profile

  const [name, setName] = useState(savedProfile.name)
  const [role, setRole] = useState(savedProfile.role)
  const [bio, setBio] = useState(savedProfile.bio)
  const [avatar, setAvatar] = useState(
  savedProfile.avatar || ''
)
  const [avatarPath, setAvatarPath] = useState(savedProfile.avatarPath || '')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

async function handleAvatarChange(event) {
  const file = event.target.files[0]

  if (!file) return

  try {
    setAvatar(await readArtworkImage(file))
    setMessage('')
  } catch (error) {
    setMessage(error.message || 'Could not process the selected image.')
  }
}

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const updatedProfile = {
      name,
      role,
      bio,
      avatar,
      avatarPath
    }

    try {
      const saved = await updateProfile(updatedProfile)
      setAvatarPath(saved.profile.avatarPath || '')
      navigate('/profile')
    } catch (error) {
      setMessage(error.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="edit-profile-page">

      <div className="edit-profile-header">

        <Link
          to="/profile"
          className="back-button"
        >
          ← Back to Profile
        </Link>

        <p className="small-title">
          PROFILE
        </p>

        <h1>
          Edit Profile
        </h1>

        <p>
          Update your artist information.
        </p>

      </div>

      <form
        className="edit-profile-form"
        onSubmit={handleSubmit}
      >
        <div className="profile-picture-section">

  <label>
    Profile Picture
  </label>

  <div className="profile-picture-preview">

    {avatar ? (
      <img
        src={avatar}
        alt="Profile"
      />
    ) : (
      <span>
        {name.charAt(0).toUpperCase()}
      </span>
    )}

  </div>

  <label className="choose-picture-button">
    Choose Image

    <input
      type="file"
      accept="image/png, image/jpeg, image/webp"
      onChange={handleAvatarChange}
      hidden
    />
  </label>

</div>

        <div className="form-section">

          <label>
            Artist Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Your artist name"
            required
          />

        </div>

        <div className="form-section">

          <label>
            Role
          </label>

          <input
            type="text"
            value={role}
            onChange={(event) =>
              setRole(event.target.value)
            }
            placeholder="e.g. Illustrator • 3D Artist"
            required
          />

        </div>

        <EmojiTextarea
          id="artist-bio"
          label="Bio"
          value={bio}
          onChange={setBio}
          placeholder="Tell people about yourself..."
          rows={6}
        />

        {message && <p className="form-message error" role="alert">{message}</p>}

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
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes →'}
          </button>

        </div>

      </form>

    </section>
  )
}

export default EditProfile