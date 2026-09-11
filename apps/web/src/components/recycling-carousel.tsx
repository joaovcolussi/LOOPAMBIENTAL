'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { carouselImageUrl, HomeCarouselSlide } from '../lib/api';

const defaultSlides = [
  { src: '/products/pet.svg', label: 'Plásticos retornando à indústria' },
  { src: '/products/aluminio.svg', label: 'Metais preparados para reciclagem' },
  { src: '/products/papelao.svg', label: 'Papel e papelão em ciclo produtivo' },
  { src: '/products/vidro.svg', label: 'Vidro separado para reaproveitamento' },
];

export function RecyclingCarousel({
  customSlides = [],
}: {
  customSlides?: HomeCarouselSlide[];
}) {
  const customByPosition = new Map(
    customSlides.map((slide) => [slide.position, slide]),
  );
  const slides = defaultSlides.map((slide, index) => {
    const custom = customByPosition.get(index + 1);
    return custom
      ? { src: carouselImageUrl(custom), label: custom.altText }
      : slide;
  });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      setPlaying(false);
  }, []);

  useEffect(() => {
    if (
      !playing ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [playing]);

  function move(direction: number) {
    setPlaying(false);
    setActive(
      (current) => (current + direction + slides.length) % slides.length,
    );
  }

  return (
    <div className="recycling-carousel" aria-roledescription="carrossel">
      <div className="carousel-viewport" aria-live="off">
        {slides.map((slide, index) => (
          <figure
            className={index === active ? 'active' : ''}
            aria-hidden={index !== active}
            key={slide.src}
          >
            <img src={slide.src} alt="" />
            <figcaption>{slide.label}</figcaption>
          </figure>
        ))}
      </div>
      <button
        type="button"
        className="carousel-control previous"
        onClick={() => move(-1)}
        aria-label="Imagem anterior"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="carousel-control next"
        onClick={() => move(1)}
        aria-label="Próxima imagem"
      >
        <ChevronRight size={20} />
      </button>
      <div className="carousel-dots" aria-label="Selecionar imagem">
        {slides.map((slide, index) => (
          <button
            type="button"
            className={index === active ? 'active' : ''}
            onClick={() => {
              setActive(index);
              setPlaying(false);
            }}
            aria-label={`Mostrar ${slide.label}`}
            aria-current={index === active}
            key={slide.src}
          />
        ))}
        <button
          type="button"
          className="carousel-playback"
          onClick={() => setPlaying((current) => !current)}
          aria-label={playing ? 'Pausar carrossel' : 'Reproduzir carrossel'}
        >
          {playing ? <Pause size={11} /> : <Play size={11} />}
        </button>
      </div>
    </div>
  );
}
