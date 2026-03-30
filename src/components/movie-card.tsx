'use client';

import Image from 'next/image';
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clapperboard, CheckCircle2, Eye, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { RatingStars } from '@/components/rating-stars';

interface MovieCardProps {
  movie: {
    title: string;
    posterUrl: string;
    synopsis: string;
    director?: string;
    actors?: string[];
    rating?: number;
  };
  index: number;
  isWatched?: boolean;
  isInWatchlist?: boolean;
}

export function MovieCard({ movie, index, isWatched = false, isInWatchlist = false }: MovieCardProps) {
  const [hasError, setHasError] = useState(false);
  const { user } = useUser();
  const db = useFirestore();

  const stableId = useMemo(() => 
    movie.title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-'), 
    [movie.title]
  );

  const handleUpdateRating = useCallback((newRating: number) => {
    if (!user || !db) return;
    const docRef = doc(db, 'users', user.uid, 'watchedMovies', stableId);
    
    // Si estamos actualizando la nota, nos aseguramos de no perder los datos existentes
    setDocumentNonBlocking(docRef, {
      id: stableId,
      userId: user.uid,
      movieId: stableId,
      title: movie.title,
      posterUrl: movie.posterUrl,
      rating: newRating,
      // Solo añadimos watchedAt si no existía ya (para no resetear el orden en el historial)
    }, { merge: true });
  }, [user, db, stableId, movie.title, movie.posterUrl]);

  const handleMarkAsWatched = () => {
    if (!user || !db) return;
    const docRef = doc(db, 'users', user.uid, 'watchedMovies', stableId);
    
    if (isInWatchlist) {
      const watchlistRef = doc(db, 'users', user.uid, 'watchlist', stableId);
      deleteDocumentNonBlocking(watchlistRef);
    }

    setDocumentNonBlocking(docRef, {
      id: stableId,
      userId: user.uid,
      movieId: stableId,
      title: movie.title,
      posterUrl: movie.posterUrl,
      rating: movie.rating || 0,
      watchedAt: new Date().toISOString()
    }, { merge: true });
  };

  const handleToggleWatchlist = () => {
    if (!user || !db) return;
    const docRef = doc(db, 'users', user.uid, 'watchlist', stableId);
    
    if (isInWatchlist) {
      deleteDocumentNonBlocking(docRef);
    } else {
      setDocumentNonBlocking(docRef, {
        id: stableId,
        userId: user.uid,
        title: movie.title,
        posterUrl: movie.posterUrl,
        addedAt: new Date().toISOString(),
      }, { merge: true });
    }
  };

  const fallbackUI = (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-secondary/40 border-b border-border/10">
      <Clapperboard className="w-12 h-12 text-primary/30 mb-4" />
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Cartel oficial</span>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">No disponible</span>
      <span className="text-lg font-headline font-bold text-primary leading-tight">{movie.title}</span>
    </div>
  );

  return (
    <Card 
      className={`group relative overflow-hidden bg-card border-none shadow-2xl movie-card-enter transition-all duration-300 hover:scale-[1.02] ${isWatched ? 'ring-2 ring-primary/20' : ''}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="aspect-[2/3] relative w-full overflow-hidden bg-muted">
        {hasError ? (
          fallbackUI
        ) : (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-105"
            unoptimized
            onError={() => setHasError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
        
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {isWatched && (
            <Badge className="bg-green-600 text-white gap-1 px-3 py-1 text-xs shadow-xl border-none">
              <CheckCircle2 className="w-3.5 h-3.5" /> Vista
            </Badge>
          )}
          {isInWatchlist && !isWatched && (
            <Badge className="bg-blue-600 text-white gap-1 px-3 py-1 text-xs shadow-xl border-none">
              <BookmarkCheck className="w-3.5 h-3.5" /> En lista
            </Badge>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {!isWatched && user && (
            <>
              <Button 
                onClick={handleMarkAsWatched}
                variant="default" 
                size="sm"
                className="w-full bg-primary/90 hover:bg-primary backdrop-blur-md gap-2 rounded-xl h-11"
              >
                <Eye className="w-4 h-4" /> Marcar como vista
              </Button>
              <Button 
                onClick={handleToggleWatchlist}
                variant="secondary" 
                size="sm"
                className="w-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border-white/10 gap-2 rounded-xl h-11"
              >
                {isInWatchlist ? <><BookmarkCheck className="w-4 h-4" /> Quitar de lista</> : <><BookmarkPlus className="w-4 h-4" /> Ver luego</>}
              </Button>
            </>
          )}
        </div>
      </div>
      
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-headline text-xl font-bold text-primary line-clamp-1">
            {movie.title}
          </h3>
        </div>
        
        {isWatched && (
          <div className="mb-4 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Tu calificación</span>
            <RatingStars 
              rating={movie.rating || 0} 
              interactive={true} 
              onRatingChange={handleUpdateRating} 
            />
          </div>
        )}

        {movie.synopsis && (
          <p className="text-muted-foreground text-xs line-clamp-2 mb-4 leading-relaxed italic">
            "{movie.synopsis}"
          </p>
        )}

        <div className="space-y-2">
          {movie.director && (
            <div className="flex items-center gap-2 text-[10px]">
              <Clapperboard className="w-3 h-3 text-accent" />
              <span className="text-muted-foreground">{movie.director}</span>
            </div>
          )}
          
          {movie.actors && movie.actors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {movie.actors.slice(0, 2).map((actor) => (
                <Badge key={actor} variant="secondary" className="bg-secondary/30 text-foreground/60 border-none text-[9px] px-2 py-0">
                  {actor}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}