import { NextResponse } from 'next/server'
import { uploadImage } from '../../../lib/cloudinary'
import { getUser } from '../../../lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler' && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('image')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5 MB.' },
        { status: 400 }
      )
    }

    const { secure_url, public_id } = await uploadImage(buffer, file.name ?? 'upload')

    return NextResponse.json({ url: secure_url, publicId: public_id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    const msg = error?.message ?? String(error)
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 })
  }
}
