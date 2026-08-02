import Loader from '../components/Loader'

// Next.js route-level loading UI — shown while a page/segment's data is
// still being fetched on the server.
export default function Loading() {
  return <Loader className="min-h-screen" />
}
