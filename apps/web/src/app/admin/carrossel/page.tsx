'use client';

import { ArrowLeft, ImagePlus, Recycle, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SessionActions } from '../../../components/session-actions';
import { api, carouselImageUrl, HomeCarouselSlide } from '../../../lib/api';

const defaults = [
  { src: '/products/pet.svg', alt: 'Plásticos retornando à indústria' },
  { src: '/products/aluminio.svg', alt: 'Metais preparados para reciclagem' },
  { src: '/products/papelao.svg', alt: 'Papel e papelão em ciclo produtivo' },
  { src: '/products/vidro.svg', alt: 'Vidro separado para reaproveitamento' },
];

export default function AdminCarouselPage() {
  const [slides, setSlides] = useState<HomeCarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    const result = await api.adminCarouselSlides();
    setSlides(result.slides);
  }

  useEffect(() => {
    load()
      .catch(() =>
        setError('Acesso restrito ou não foi possível carregar o carrossel.'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando carrossel...</div>
      </main>
    );

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/admin">
            <ArrowLeft size={15} /> Voltar à gestão
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="admin-dashboard shell">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">conteúdo da página inicial</p>
            <h1>Carrossel da home.</h1>
            <p className="dashboard-lede">
              Substitua cada imagem mantendo uma descrição acessível. A
              publicação é imediata.
            </p>
          </div>
          <a
            className="secondary-button small"
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            Visualizar home
          </a>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="carousel-admin-grid">
          {defaults.map((fallback, index) => {
            const position = index + 1;
            return (
              <CarouselSlotEditor
                key={position}
                position={position}
                fallback={fallback}
                slide={slides.find((item) => item.position === position)}
                onChanged={async () => {
                  setError('');
                  try {
                    await load();
                  } catch {
                    setError(
                      'A imagem foi alterada, mas não foi possível atualizar a lista.',
                    );
                  }
                }}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}

function CarouselSlotEditor({
  position,
  fallback,
  slide,
  onChanged,
}: {
  position: number;
  fallback: { src: string; alt: string };
  slide?: HomeCarouselSlide;
  onChanged: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [altText, setAltText] = useState(slide?.altText ?? fallback.alt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setAltText(slide?.altText ?? fallback.alt);
  }, [slide?.altText, fallback.alt]);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save() {
    if (!file) {
      setMessage('Selecione uma imagem antes de salvar.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await api.replaceCarouselSlide(position, {
        image: file,
        altText,
        expectedVersion: slide?.version ?? 0,
      });
      setFile(null);
      setMessage('Imagem publicada com sucesso.');
      await onChanged();
    } catch {
      setMessage(
        'Não foi possível publicar. Recarregue se outro administrador alterou esta posição.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!slide || !window.confirm('Restaurar a imagem padrão desta posição?'))
      return;
    setSaving(true);
    setMessage('');
    try {
      await api.resetCarouselSlide(position, slide.version ?? 0);
      setFile(null);
      setMessage('Imagem padrão restaurada.');
      await onChanged();
    } catch {
      setMessage('Não foi possível restaurar a imagem desta posição.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="carousel-admin-card">
      <div className="carousel-admin-preview">
        <img
          src={preview || (slide ? carouselImageUrl(slide) : fallback.src)}
          alt={altText}
        />
        <span>Posição {position}</span>
      </div>
      <div className="carousel-admin-fields">
        <label>
          Nova imagem
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Descrição da imagem
          <input
            minLength={3}
            maxLength={180}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
          />
        </label>
        <small>
          JPEG, PNG ou WebP, até 5 MB. A imagem será ajustada para 1600 × 1000.
        </small>
        {message && (
          <p className="form-note" role="status">
            {message}
          </p>
        )}
        <div className="carousel-admin-actions">
          <button
            className="button small"
            type="button"
            disabled={saving || altText.trim().length < 3}
            onClick={save}
          >
            <ImagePlus size={15} />{' '}
            {saving ? 'Salvando...' : 'Salvar e publicar'}
          </button>
          {slide && (
            <button
              className="link-button"
              type="button"
              disabled={saving}
              onClick={reset}
            >
              <RotateCcw size={14} /> Restaurar padrão
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
