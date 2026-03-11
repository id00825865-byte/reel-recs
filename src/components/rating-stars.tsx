
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

  return (
    <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (interactive && onRatingChange) {
              setLocalRating(star); // Feedback visual instantáneo
              onRatingChange(star);
            }
          }}
          className={cn(
            "transition-all duration-200 outline-none focus:ring-0",
            interactive ? "hover:scale-125 cursor-pointer" : "cursor-default"
          )}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-colors duration-200",
              star <= displayRating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}
