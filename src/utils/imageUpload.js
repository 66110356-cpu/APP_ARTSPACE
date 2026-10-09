const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const TARGET_DATA_URL_BYTES = 1.5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not open the selected image. Please try another file.'))
    }
    image.src = objectUrl
  })
}

function canvasToDataUrl(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not compress the selected image.'))
          return
        }

        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('Could not read the compressed image.'))
            return
          }
          resolve(reader.result)
        }
        reader.onerror = () => reject(new Error('Could not read the compressed image.'))
        reader.readAsDataURL(blob)
      },
      'image/webp',
      quality
    )
  })
}

export async function readArtworkImage(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a PNG, JPG, or WEBP image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 15 MB or smaller.')
  }

  const image = await loadImage(file)
  const maxDimension = 2400
  let scale = Math.min(1, maxDimension / Math.max(image.width, image.height))

  while (scale >= 0.25) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Image processing is not available in this browser.')
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.84, 0.72, 0.6]) {
      const dataUrl = await canvasToDataUrl(canvas, quality)
      if (dataUrl.length * 0.75 <= TARGET_DATA_URL_BYTES) return dataUrl
    }

    scale *= 0.75
  }

  throw new Error('Could not reduce this image enough to save it. Please choose a smaller image.')
}
