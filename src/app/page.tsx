'use client';

import { useState } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Film, Search, Loader2, Sparkles, Clapperboard, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput | null>(null);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) return;

    setLoading(true);
    setRecommendations(null); // Limpiar resultados previos

    try {
      const results = await recommendMovies({ preferences });
      setRecommendations(results);
    } catch (error: any) {
      toast({
        title: "Error de conexión",
        description: error.message || "No pudimos obtener tus recomendaciones. Revisa tu conexión o configuración.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background selection:bg-accent/30 flex flex-col items-center">
      <Toaster />
      {/* Hero Section */}
      <header className="w-full max-w-7xl px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top duration-700">
          <div className="p-3 rounded-full bg-primary/20 text-primary border border-primary/20">
            <Film className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-foreground">
            Reel<span className="text-primary">Recs</span>
          </h1>
        </div>
        <p className="font-body text-xl text-muted-foreground max-w-2xl animate-in fade-in slide-in-from-top duration-1000 delay-150">
          Tu curador personal de cine. Describe un estado de ánimo, un género o un actor, y encontraremos tu próxima película favorita.
        </p>

        {/* Search Input Container */}
        <section className="w-full max-w-3xl mt-12 animate-in fade-in zoom-in duration-1000 delay-300">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl group-focus-within:bg-accent/20 transition-colors duration-500 rounded-full -z-10" />
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-card rounded-2xl border border-border shadow-2xl focus-within:border-primary/50 transition-all duration-300">
              <Input
                placeholder="¿Qué te apetece ver? (ej. 'Acción con Tom Cruise' o 'Algo como Inception')"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="flex-1 bg-transparent border-none text-lg h-14 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 px-6"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 md:px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-2 shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                disabled={loading || !preferences.trim()}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-accent" />
                    Buscar Películas
                  </>
                )}
              </Button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-sm text-muted-foreground">Sugerencias:</span>
            {['Thrillers neo-noir', 'Vibras de Wes Anderson', 'Comedias románticas de los 90', 'Exploración espacial'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setPreferences(suggestion)}
                className="text-xs px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      </header>

      {/* Results Section */}
      <section className="w-full max-w-7xl px-6 pb-24 flex-1">
        {!recommendations && !loading && (
          <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground opacity-40 animate-in fade-in duration-1000">
            <Clapperboard className="w-24 h-24 mb-6 stroke-1" />
            <p className="text-lg italic font-headline">Tu viaje cinematográfico comienza aquí...</p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[2/3] bg-card/50 rounded-2xl animate-pulse flex flex-col">
                <div className="flex-1 bg-muted/20 rounded-t-2xl" />
                <div className="p-6 space-y-4">
                  <div className="h-6 w-3/4 bg-muted/20 rounded" />
                  <div className="h-4 w-full bg-muted/20 rounded" />
                  <div className="h-4 w-full bg-muted/20 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendations && !loading && (
          <div className="mt-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-headline text-3xl font-bold flex items-center gap-3">
                <Search className="w-6 h-6 text-primary" />
                Selección para ti
              </h2>
              <span className="text-muted-foreground text-sm uppercase tracking-widest bg-secondary/30 px-3 py-1 rounded-lg">
                {recommendations.movies.length} Resultados
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recommendations.movies.map((movie, idx) => (
                <MovieCard key={`${movie.title}-${idx}`} movie={movie} index={idx} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-border/50 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} ReelRecs. IA para cinéfilos.</p>
      </footer>
    </main>
  );
}
