'use client';

import { useState } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { AuthForm } from '@/components/auth-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Film, Search, Loader2, Sparkles, LogOut, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function Home() {
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput | null>(null);
  
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();

  // Obtener peliculas vistas del usuario
  const watchedMoviesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'watchedMovies'));
  }, [db, user]);
  
  const { data: watchedMovies } = useCollection(watchedMoviesQuery);
  const watchedTitles = watchedMovies?.map(m => m.title) || [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) return;

    setLoading(true);
    setRecommendations(null);

    try {
      const results = await recommendMovies({ 
        preferences,
        excludeMovies: watchedTitles 
      });
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

  const handleSignOut = () => {
    signOut(auth);
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
        <Toaster />
        <div className="mb-12 flex items-center gap-4">
          <Film className="w-12 h-12 text-primary" />
          <h1 className="font-headline text-5xl font-black">ReelRecs</h1>
        </div>
        <AuthForm />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <Toaster />
      
      {/* Navbar con Usuario */}
      <nav className="w-full border-b border-border/10 bg-card/30 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Film className="w-6 h-6 text-primary" />
          <span className="font-headline text-2xl font-bold">ReelRecs</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
            <UserIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <header className="w-full max-w-7xl px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <h1 className="font-headline text-5xl md:text-7xl font-black mb-4 tracking-tight">
          ¿Qué <span className="text-primary italic">sentimos</span> hoy?
        </h1>
        <p className="font-body text-xl text-muted-foreground max-w-2xl mb-12">
          IA personalizada que ignora las {watchedMovies?.length || 0} películas que ya has visto.
        </p>

        <section className="w-full max-w-3xl">
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative flex flex-col md:flex-row gap-4 p-3 bg-card rounded-3xl border border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] focus-within:border-primary/50 transition-all duration-500">
              <Input
                placeholder="Busca por género, humor o películas similares..."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="flex-1 bg-transparent border-none text-xl h-16 focus-visible:ring-0 px-6"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-16 md:px-10 bg-primary hover:bg-primary/90 rounded-2xl gap-2"
                disabled={loading || !preferences.trim()}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6" /> Buscar</>}
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
              <h2 className="font-headline text-3xl font-bold flex items-center gap-3 px-4 text-primary italic">
                Sugerencias para ti
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {recommendations.movies.map((movie, idx) => (
                <MovieCard 
                  key={`${movie.title}-${idx}`} 
                  movie={movie} 
                  index={idx}
                  isWatched={watchedTitles.includes(movie.title)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="w-full py-10 border-t border-border/10 text-center text-muted-foreground/40 text-sm">
        <p>© {new Date().getFullYear()} ReelRecs. Tu historial de {watchedMovies?.length || 0} películas está a salvo.</p>
      </footer>
    </main>
  );
}
