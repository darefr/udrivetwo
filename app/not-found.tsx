import Link from 'next/link'
import { ArrowRight, Signpost } from 'lucide-react'
export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap missing-page">
        <Signpost size={36} />
        <p className="eyebrow">PAGE NOT FOUND</p>
        <h1>A different turn.</h1>
        <p>
          This page is not on our current route. Head back to the fleet or
          return home.
        </p>
        <div className="action-row">
          <Link className="action primary" href="/fleet">
            Explore fleet
            <ArrowRight size={16} />
          </Link>
          <Link className="action outline" href="/">
            Return home
          </Link>
        </div>
      </div>
    </section>
  )
}
