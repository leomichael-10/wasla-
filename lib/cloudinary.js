import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload a file buffer to Cloudinary under the tobaki/products folder.
 * @param {Buffer} buffer - The image file buffer
 * @param {string} filename - Original filename (used as public_id base)
 * @returns {{ secure_url: string, public_id: string }}
 */
export async function uploadImage(buffer, filename) {
  const sanitized = filename.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/\.[^.]+$/, '')

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:           'tobaki/products',
        public_id:        `${sanitized}_${Date.now()}`,
        resource_type:    'image',
        transformation:   [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({ secure_url: result.secure_url, public_id: result.public_id })
      }
    )
    stream.end(buffer)
  })
}

/**
 * Delete an image from Cloudinary by its public_id.
 * @param {string} publicId
 */
export async function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId)
}
