import type { Photo } from '@/types/photo-type';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

/**
 * Folga para considerar a faixa "no fim".
 *
 * A rolagem suave para em frações de pixel e o zoom do navegador arredonda a
 * largura; comparar com o máximo exato deixaria o botão aceso sem ter mais
 * nada para onde ir.
 */
const EDGE_TOLERANCE = 8;

/** Quanto a seta avança: quase uma tela, mantendo uma foto como referência. */
const PAGE_RATIO = 0.8;

/**
 * Faixa horizontal com as fotos de um encontro.
 *
 * Rolagem nativa com `snap` em vez de um carrossel controlado por índice: no
 * celular o gesto de arrastar já é o esperado, e a rolagem nativa mantém a
 * navegação por teclado e a barra de rolagem sem código nenhum. As setas
 * existem para o desktop, onde não há gesto.
 */
export function EventPhotoCarousel({
  photos,
  detailsPath,
  label,
}: {
  photos: Photo[];
  /** Para onde a foto leva — o encontro a que ela pertence. */
  detailsPath: string;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const syncEdges = useCallback(() => {
    const track = trackRef.current;

    if (!track)
      return;

    const maxScroll = track.scrollWidth - track.clientWidth;

    setEdges({
      atStart: track.scrollLeft <= EDGE_TOLERANCE,
      atEnd: track.scrollLeft >= maxScroll - EDGE_TOLERANCE,
    });
  }, []);

  // A primeira medição sai do callback de ref, e não de um efeito: é aqui que
  // o nó existe com a largura real. Trocar de encontro remonta o componente
  // (o pai o identifica pelo id do encontro), então a medição refaz sozinha.
  const attachTrack = useCallback((node: HTMLDivElement | null) => {
    trackRef.current = node;

    if (node)
      syncEdges();
  }, [syncEdges]);

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;

    if (!track)
      return;

    track.scrollBy({ left: direction * track.clientWidth * PAGE_RATIO, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={attachTrack}
        onScroll={syncEdges}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
      >
        {photos.map(photo => (
          <Link
            key={photo.id}
            to={detailsPath}
            className="group relative w-56 shrink-0 snap-start overflow-hidden rounded-xl sm:w-72"
          >
            <img
              src={photo.downloadUrl}
              alt={photo.caption || 'Foto do encontro'}
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {photo.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-xs text-white">
                <span className="line-clamp-2">{photo.caption}</span>
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* As setas só aparecem onde não há gesto de arrastar. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between md:flex">
        <CarouselArrow direction="left" disabled={edges.atStart} onClick={() => scrollByPage(-1)} />
        <CarouselArrow direction="right" disabled={edges.atEnd} onClick={() => scrollByPage(1)} />
      </div>
    </div>
  );
}

function CarouselArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Fotos anteriores' : 'Próximas fotos'}
      className={cn(
        'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full',
        'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-md transition-opacity',
        direction === 'left' ? '-ml-3' : '-mr-3',
        disabled && 'pointer-events-none opacity-0',
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
