
'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}

export function RatingStars({ rating, onRatingChange, interactive = false }: RatingStarsProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRatingChange?.(star)}
          className={cn(
            "transition-all duration-200",
            interactive ? "hover:scale-125 cursor-pointer" : "cursor-default"
          )}
        >
          <Star
            className={cn(
              "w-5 h-5",
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}
