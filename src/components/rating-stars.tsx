
'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}

export function RatingStars({ rating, onRatingChange, interactive = false }: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [localRating, setLocalRating] = useState(rating);

  // Sincronizar el estado local con el prop cuando cambie el dato real de la base de datos
  useEffect(() => {
    setLocalRating(rating);
  }, [rating]);

  const displayRating = hoverRating || localRating;

  const handleRatingClick = (newRating: number) => {
    if (interactive && onRatingChange) {
      setLocalRating(newRating);
      onRatingChange(newRating);
    }
  };

  return (
    <div 
      className="flex items-center gap-1.5" 
      onMouseLeave={() => interactive && setHoverRating(0)}
    >
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          // Lógica de visualización
          const isFull = displayRating >= starIndex;
          const isHalf = displayRating >= starIndex - 0.5 && displayRating < starIndex;

          return (
            <div 
              key={starIndex} 
              className={cn(
                "relative w-6 h-6 transition-transform duration-200",
                interactive && "hover:scale-110"
              )}
            >
              {/* Estrella de fondo (vacía) */}
              <Star className="w-6 h-6 text-muted-foreground/20 absolute inset-0" />
              
              {/* Media estrella rellena */}
              {isHalf && (
                <div className="absolute inset-0 overflow-hidden w-[50%] z-10">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                </div>
              )}

              {/* Estrella completa rellena */}
              {isFull && (
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400 absolute inset-0 z-10" />
              )}

              {/* Zonas interactivas ocultas */}
              {interactive && (
                <div className="absolute inset-0 flex z-20">
                  <div 
                    className="w-1/2 h-full cursor-pointer"
                    onMouseEnter={() => setHoverRating(starIndex - 0.5)}
                    onClick={(e) => {
                      e.preventDefault();
                      handleRatingClick(starIndex - 0.5);
                    }}
                  />
                  <div 
                    className="w-1/2 h-full cursor-pointer"
                    onMouseEnter={() => setHoverRating(starIndex)}
                    onClick={(e) => {
                      e.preventDefault();
                      handleRatingClick(starIndex);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Indicador numérico opcional para claridad */}
      {displayRating > 0 && (
        <span className="text-xs font-bold text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded-full min-w-[2.5rem] text-center">
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
