'use client';

import { useState, useMemo } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { AuthForm } from '@/components/auth-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Search, Loader2, Sparkles, LogOut, User as UserIcon, History, Bookmark, Sparkle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// Función para generar un ID estable y limpio
const getStableId = (title: string) => title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

export default function Home() {
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput | null>(null);
  const [activeTab, setActiveTab] = useState('explore');
  
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();

  // Suscribirse a películas vistas
  const watchedMoviesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'watchedMovies'), orderBy('watchedAt', 'desc'));
  }, [db, user]);
  const { data: watchedMovies } = useCollection(watchedMoviesQuery);
  
  // Mapa de calificaciones para acceso rápido
  const watchedRatingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    watchedMovies?.forEach(m => {
      const id = getStableId(m.title);
      map[id] = m.rating || 0;
    });
    return map;
  }, [watchedMovies]);

  const watchedIds = useMemo(() => Object.keys(watchedRatingsMap), [watchedRatingsMap]);

  // Suscribirse a lista de deseos
  const watchlistQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'watchlist'), orderBy('addedAt', 'desc'));
  }, [db, user]);
  const { data: watchlistMovies } = useCollection(watchlistQuery);
  const watchlistIds = useMemo(() => watchlistMovies?.map(m => getStableId(m.title)) || [], [watchlistMovies]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) return;

    setLoading(true);
    setRecommendations(null);

    try {
      const results = await recommendMovies({ 
        preferences,
        excludeMovies: watchedMovies?.map(m => m.title) || [] 
      });
      setRecommendations(results);
      setActiveTab('explore');
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

  const handleExportData = () => {
    if (!user) return;
    
    const dataToExport = {
      user: user.email,
      watchedMovies: watchedMovies || [],
      watchlist: watchlistMovies || [],
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ReelRecs-Backup-${user.email}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Respaldo generado",
      description: "Tus datos se han guardado en un archivo JSON local.",
    });
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
      
      <nav className="w-full border-b border-border/10 bg-card/30 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('explore')}>
          <Film className="w-6 h-6 text-primary" />
          <span className="font-headline text-2xl font-bold">ReelRecs</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
            <UserIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleExportData} title="Descargar respaldo local" className="hover:text-primary">
            <Download className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión" className="hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex flex-col items-center text-center">
        <h1 className="font-headline text-4xl md:text-6xl font-black mb-4 tracking-tight">
          ¿Qué <span className="text-primary italic">cine</span> te apetece?
        </h1>
        
        <section className="w-full max-w-3xl mt-8">
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-card rounded-2xl border border-border/50 shadow-2xl focus-within:border-primary/50 transition-all">
              <Input
                placeholder="Busca por género, humor o películas similares..."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="flex-1 bg-transparent border-none text-lg h-14 focus-visible:ring-0 px-4"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 md:px-8 bg-primary hover:bg-primary/90 rounded-xl gap-2 font-bold"
                disabled={loading || !preferences.trim()}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> Buscar</>}
              </Button>
            </div>
          </form>
        </section>
      </header>

      <section className="w-full max-w-7xl px-6 pb-24 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-secondary/40 p-1 rounded-xl h-12 border border-border/30">
              <TabsTrigger value="explore" className="rounded-lg gap-2 px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Sparkle className="w-4 h-4" /> Recomendaciones
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="rounded-lg gap-2 px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Bookmark className="w-4 h-4" /> Por ver
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg gap-2 px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-white">
                <History className="w-4 h-4" /> Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="explore" className="mt-0 outline-none">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[2/3] bg-card/30 rounded-2xl animate-pulse border border-border/10" />
                ))}
              </div>
            ) : recommendations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {recommendations.movies.map((movie, idx) => {
                  const titleId = getStableId(movie.title);
                  return (
                    <MovieCard 
                      key={titleId} 
                      movie={{
                        ...movie,
                        rating: watchedRatingsMap[titleId] || 0
                      }} 
                      index={idx}
                      isWatched={watchedIds.includes(titleId)}
                      isInWatchlist={watchlistIds.includes(titleId)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <Sparkle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Usa el buscador para generar recomendaciones mágicas</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist" className="mt-0 outline-none">
            {watchlistMovies && watchlistMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {watchlistMovies.map((movie, idx) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={{
                      title: movie.title,
                      posterUrl: movie.posterUrl,
                      synopsis: "",
                    }} 
                    index={idx}
                    isInWatchlist={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Aún no tienes películas guardadas para ver luego</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0 outline-none">
            {watchedMovies && watchedMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {watchedMovies.map((movie, idx) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={{
                      title: movie.title,
                      posterUrl: movie.posterUrl,
                      synopsis: "",
                      rating: movie.rating
                    }} 
                    index={idx}
                    isWatched={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Aún no has marcado ninguna película como vista</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <footer className="w-full py-10 border-t border-border/10 text-center text-muted-foreground/40 text-sm">
        <p>© {new Date().getFullYear()} ReelRecs. IA que recuerda tus {watchedMovies?.length || 0} películas.</p>
      </footer>
    </main>
  );
}