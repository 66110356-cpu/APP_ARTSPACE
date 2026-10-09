import { useRef, useState } from 'react'

const EMOJIS = ['😀', '😊', '😍', '🥰', '😎', '🤍', '❤️', '✨', '🎨', '🖌️', '🌈', '🌙', '⭐', '🦋', '🌸', '🔥']

function EmojiTextarea({ label, value, onChange, placeholder, rows = 5, id }) {
  const textareaRef = useRef(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  function insertEmoji(emoji) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const updatedValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`
    onChange(updatedValue)
    setIsPickerOpen(false)

    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPosition = start + emoji.length
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    })
  }

  return (
    <div className="form-section emoji-textarea">
      <div className="emoji-textarea-heading">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="emoji-picker-toggle"
          aria-expanded={isPickerOpen}
          aria-label={`Choose emoji for ${label}`}
          onClick={() => setIsPickerOpen(!isPickerOpen)}
        >
          ☺ Add emoji
        </button>
      </div>
      {isPickerOpen && (
        <div className="emoji-picker" role="group" aria-label="Choose an emoji">
          {EMOJIS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              aria-label={`Insert ${emoji}`}
              onClick={() => insertEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  )
}

export default EmojiTextarea
