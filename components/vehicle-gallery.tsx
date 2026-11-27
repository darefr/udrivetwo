'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Expand, X } from 'lucide-react'
import { type Vehicle } from '@/lib/rental-data'

export function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const [index, setIndex] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const photo = vehicle.gallery[index]
  const change = (by: number) =>
    setIndex((i) => (i + by + vehicle.gallery.length) % vehicle.gallery.length)
  return (
    <div className="vehicle-gallery">
      <div className="gallery-main">
        <Image
          key={photo.image}
          src={photo.image}
          alt={`${vehicle.name}: ${photo.label}`}
          width={508}
          height={508}
          priority
          sizes="(max-width:800px) 90vw, 54vw"
        />
        <button
          className="gallery-expand"
          aria-label="Enlarge vehicle photo"
          onClick={() => dialog.current?.showModal()}
        >
          <Expand size={16} />
        </button>
        <span className="gallery-counter">
          {index + 1} / {vehicle.gallery.length}
        </span>
      </div>
      <div className="gallery-thumbnails" aria-label="Vehicle photo selection">
        {vehicle.gallery.map((p, i) => (
          <button
            key={p.image}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            aria-label={`Show ${p.label.toLowerCase()}`}
          >
            <Image src={p.image} alt="" width={80} height={56} />
            <span>{p.label.split(' ')[0]} view</span>
          </button>
        ))}
      </div>
      <p className="photo-note">
        Representative vehicle imagery. Exact vehicle and trim are confirmed
        before rental.
      </p>
      <dialog
        className="gallery-dialog"
        ref={dialog}
        aria-labelledby="gallery-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close()
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') change(-1)
          if (e.key === 'ArrowRight') change(1)
        }}
      >
        <div className="lightbox-frame">
          <div className="lightbox-header">
            <h2 id="gallery-title">{vehicle.name}</h2>
            <button
              className="icon-button"
              aria-label="Close enlarged photo"
              onClick={() => dialog.current?.close()}
            >
              <X size={19} />
            </button>
          </div>
          <Image
            src={photo.image}
            alt={`${vehicle.name}: ${photo.label}`}
            width={700}
            height={700}
          />
          <div className="lightbox-footer">
            <button
              className="icon-button"
              aria-label="Previous photo"
              onClick={() => change(-1)}
            >
              <ArrowLeft size={16} />
            </button>
            <span>
              {photo.label} · {index + 1} / {vehicle.gallery.length}
            </span>
            <button
              className="icon-button"
              aria-label="Next photo"
              onClick={() => change(1)}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
