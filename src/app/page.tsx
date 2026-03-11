'use client';

import { useState } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Film, Search, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
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
    setRecommendations(null);

    try {
      const results = await recommendMovies({ preferences });
      setRecommendations(results);
    } catch (error: any) {
      toast({
        title: "Error en la búsqueda",
        description: error.message || "No pudimos obtener recomendaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background selection:bg-accent/30 flex flex-col items-center">
      <Toaster />
      
      <header className="w-full max-w-7xl px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top duration-700">
          <div className="p-4 rounded-2xl bg-primary/20 text-primary border border-primary/20 shadow-inner">
            <Film className="w-10 h-10" />
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tight text-foreground">
            Reel<span className="text-primary">Recs</span>
          </h1>
        </div>
        <p className="font-body text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12">
          Encuentra tu próxima película favorita con Inteligencia Artificial.
        </p>

        <section className="w-full max-w-3xl">
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative flex flex-col md:flex-row gap-4 p-3 bg-card rounded-3xl border border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] focus-within:border-primary/50 focus-within:shadow-primary/5 transition-all duration-500">
              <Input
                placeholder="¿Qué te apetece ver? (ej. 'Un thriller psicológico con giros inesperados')"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="flex-1 bg-transparent border-none text-xl h-16 focus-visible:ring-0 px-6 placeholder:text-muted-foreground/50"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-16 md:px-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                disabled={loading || !preferences.trim()}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-accent" />
                    <span className="text-lg">Buscar</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      </header>

      {/* Resultados */}
      <section className="w-full max-w-7xl px-6 pb-24 flex-1">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[2/3] bg-card/30 rounded-3xl animate-pulse border border-border/20" />
            ))}
          </div>
        )}

        {recommendations && !loading && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
              <h2 className="font-headline text-3xl font-bold flex items-center gap-3 px-4 text-primary">
                <Search className="w-7 h-7" />
                Resultados Sugeridos
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {recommendations.movies.map((movie, idx) => (
                <MovieCard key={`${movie.title}-${idx}`} movie={movie} index={idx} />
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="w-full py-10 border-t border-border/10 text-center text-muted-foreground/60 text-sm flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
          <ShieldCheck className="w-4 h-4" />
          Servicio de IA activo y optimizado
        </div>
        <p>© {new Date().getFullYear()} ReelRecs. IA para cinéfilos exigentes.</p>
      </footer>
    </main>
  );
}
