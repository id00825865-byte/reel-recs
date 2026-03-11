import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clapperboard, User, UserSquare2 } from 'lucide-react';

interface MovieCardProps {
  movie: {
    title: string;
    posterUrl: string;
    synopsis: string;
    director: string;
    actors: string[];
  };
  index: number;
}

export function MovieCard({ movie, index }: MovieCardProps) {
  return (
    <Card 
      className="group relative overflow-hidden bg-card border-none shadow-2xl movie-card-enter transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/10"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="aspect-[2/3] relative w-full overflow-hidden">
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized // External URLs might need this or proper remote patterns
          data-ai-hint="movie poster"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
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
              <span className="font-semibold text-foreground/80 block w-full mb-1">Starring:</span>
              {movie.actors.map((actor) => (
                <Badge key={actor} variant="secondary" className="bg-secondary/50 text-foreground/70 hover:bg-secondary border-none px-2 py-0">
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