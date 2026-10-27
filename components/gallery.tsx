"use client";

import { useState } from "react";
import photos from "@/data/photos.json";

export function Gallery() {
  const [index, setIndex] = useState(0);
  if (!photos.length) return <p>Photos coming soon.</p>;
  return <div className="carousel waveform-pulse" role="region" aria-roledescription="carousel" aria-label="EIEC in action">
    <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)`, transition: "transform 0.4s ease" }}>
      {photos.map((file, i) => <img key={file} src={`/photos/${file}`} alt={`EIEC club activity, photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} aria-hidden={i !== index} />)}
    </div>
    <button type="button" className="carousel-btn carousel-prev" aria-label="Previous photo" onClick={() => setIndex((index - 1 + photos.length) % photos.length)}>←</button>
    <button type="button" className="carousel-btn carousel-next" aria-label="Next photo" onClick={() => setIndex((index + 1) % photos.length)}>→</button>
    <span className="sr-only" aria-live="polite">Photo {index + 1} of {photos.length}</span>
  </div>;
}
