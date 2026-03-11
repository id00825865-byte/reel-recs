'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clapperboard, UserSquare2, CheckCircle2, Eye } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface MovieCardProps {
  movie: {
    title: string;
    posterUrl: string;
    synopsis: string;
    director: string;
    actors: string[];
  };
  index: number;
  isWatched?: boolean;
}

export function MovieCard({ movie, index, isWatched = false }: MovieCardProps) {
  const [imgSrc, setImgSrc] = useState(movie.posterUrl);
  const [hasError, setHasError] = useState(false);
  const { user } = useUser();
  const db = useFirestore();

  const handleMarkAsWatched = () => {
    if (!user || !db) return;
    const watchedMovieId = encodeURIComponent(movie.title.toLowerCase());
    const docRef = doc(db, 'users', user.uid, 'watchedMovies', watchedMovieId);
    setDocumentNonBlocking(docRef, {
      id: watchedMovieId,
      userId: user.uid,
      movieId: watchedMovieId,
      title: movie.title,
      watchedAt: new Date().toISOString(),
    }, { merge: true });
  };

  const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(movie.title)}/600/900`;

  return (
    <Card 
      className={`group relative overflow-hidden bg-card border-none shadow-2xl movie-card-enter transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/10 ${isWatched ? 'opacity-70 grayscale-[0.5]' : ''}`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="aspect-[2/3] relative w-full overflow-hidden bg-muted">
        <Image
          src={hasError ? fallbackUrl : imgSrc}
          alt={movie.title}
          fill
          className={`object-cover transition-all duration-500 ${hasError ? 'grayscale opacity-50' : 'group-hover:scale-110'}`}
          unoptimized
          onError={() => {
            if (!hasError) setHasError(true);
          }}
          data-ai-hint="movie poster"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
        
        {isWatched && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-green-500 text-white gap-1 px-3 py-1 text-sm shadow-xl">
              <CheckCircle2 className="w-4 h-4" /> Ya vista
            </Badge>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2">
          {!isWatched && user && (
            <Button 
              onClick={handleMarkAsWatched}
              variant="secondary" 
              className="w-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border-white/10 gap-2"
            >
              <Eye className="w-4 h-4" /> Marcar como vista
            </Button>
          )}
        </div>
      </div>
      <CardContent className="p-6">
        <h3 className="font-headline text-2xl font-bold mb-3 text-primary group-hover:text-accent transition-colors">
          {movie.title}
        </h3>
        
        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 leading-relaxed italic">
          "{movie.synopsis}"
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clapperboard className="w-4 h-4 text-accent" />
            <span className="font-semibold text-foreground/80">Director:</span>
            <span className="text-muted-foreground">{movie.director}</span>
          </div>
          
          <div className="flex items-start gap-2 text-sm">
            <UserSquare2 className="w-4 h-4 text-accent mt-1 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {movie.actors.slice(0, 3).map((actor) => (
                <Badge key={actor} variant="secondary" className="bg-secondary/50 text-foreground/70 border-none">
                  {actor}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
