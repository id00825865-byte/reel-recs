
'use client';

import { useState, useMemo, useEffect } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { AuthForm } from '@/components/auth-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Film, 
  Search, 
  Loader2, 
  Sparkles, 
  LogOut, 
  User as UserIcon, 
  History, 
  Bookmark, 
  Sparkle, 
  ShieldCheck, 
  Users, 
  Clock, 
  Trash2, 
  UserPlus, 
  UserMinus,
  Ban,
  MessageSquareShare,
  Zap,
  ZapOff,
  AlertTriangle,
  CalendarDays,
  Circle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const getStableId = (title: string) => title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

export default function Home() {
  const [preferences, setPreferences] = useState('');
  const [mood, setMood] = useState('any');
  const [duration, setDuration] = useState('any');
  const [platform, setPlatform] = useState('any');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput | null>(null);
  const [activeTab, setActiveTab] = useState('explore');
  
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Documento del perfil del usuario actual
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  // Estadísticas globales para el admin
  const statsDocRef = useMemoFirebase(() => {
    if (!db || !userData?.isAdmin) return null;
    return doc(db, 'globalStats', todayStr);
  }, [db, userData?.isAdmin, todayStr]);
  const { data: globalTodayStats } = useDoc(statsDocRef);

  // Sincronización del perfil del usuario
  useEffect(() => {
    if (user && db && !isUserDataLoading && !isUserLoading) {
      const userRef = doc(db, 'users', user.uid);
      
      const realCreationDate = user.metadata.creationTime 
        ? new Date(user.metadata.creationTime).toISOString() 
        : new Date().toISOString();

      if (!userData || !userData.createdAt) {
        setDocumentNonBlocking(userRef, {
          email: user.email,
          createdAt: realCreationDate,
          lastLogin: serverTimestamp(),
          id: user.uid,
          isAdmin: userData?.isAdmin || false,
          status: userData?.status || 'active',
          recommendationCount: userData?.recommendationCount || 0,
          isRestricted: userData?.isRestricted || false
        }, { merge: true });
      } else {
        updateDocumentNonBlocking(userRef, { 
          lastLogin: serverTimestamp(),
          email: user.email,
          createdAt: userData.createdAt || realCreationDate // Aseguramos que no se pierda la fecha real
        });
      }
    }
  }, [user, db, userData, isUserDataLoading, isUserLoading]);

  // Consultas de películas
  const watchedMoviesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'watchedMovies'), orderBy('watchedAt', 'desc'));
  }, [db, user]);
  const { data: watchedMovies } = useCollection(watchedMoviesQuery);
  
  const watchlistQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'watchlist'), orderBy('addedAt', 'desc'));
  }, [db, user]);
  const { data: watchlistMovies } = useCollection(watchlistQuery);

  // Panel de administración
  const allUsersQuery = useMemoFirebase(() => {
    if (!db || !userData?.isAdmin) return null;
    return query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
  }, [db, userData?.isAdmin]);
  const { data: allUsers, isLoading: isLoadingAdmin } = useCollection(allUsersQuery);

  const watchedRatingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    watchedMovies?.forEach(m => {
      const id = getStableId(m.title);
      map[id] = m.rating || 0;
    });
    return map;
  }, [watchedMovies]);
  const watchedIds = useMemo(() => Object.keys(watchedRatingsMap), [watchedRatingsMap]);
  const watchlistIds = useMemo(() => watchlistMovies?.map(m => getStableId(m.title)) || [], [watchlistMovies]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) return;

    if (userData?.isRestricted) {
      toast({ 
        title: "Acceso denegado", 
        description: "Tu acceso a la IA ha sido pausado por un administrador.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    setRecommendations(null);
    try {
      const results = await recommendMovies({ 
        preferences,
        excludeMovies: watchedMovies?.map(m => m.title) || [],
        mood: mood !== 'any' ? mood : undefined,
        maxDuration: duration !== 'any' ? duration : undefined,
        platform: platform !== 'any' ? platform : undefined,
      });
      setRecommendations(results);
      
      if (db && user) {
        const statRef = doc(db, 'globalStats', todayStr);
        setDocumentNonBlocking(statRef, { recommendationRequests: increment(1) }, { merge: true });
        
        const userRef = doc(db, 'users', user.uid);
        updateDocumentNonBlocking(userRef, { recommendationCount: increment(1) });
      }
      
      setActiveTab('explore');
    } catch (error: any) {
      toast({ title: "Error en la búsqueda", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = (targetUserId: string, currentStatus: boolean) => {
    if (!db) return;
    const ref = doc(db, 'users', targetUserId);
    updateDocumentNonBlocking(ref, { isAdmin: !currentStatus });
    toast({ title: "Rol actualizado", description: `Usuario ${!currentStatus ? 'promocionado' : 'degradado'}` });
  };

  const handleToggleRestriction = (targetUserId: string, currentRestricted: boolean) => {
    if (!db) return;
    const ref = doc(db, 'users', targetUserId);
    updateDocumentNonBlocking(ref, { isRestricted: !currentRestricted });
    toast({ 
      title: !currentRestricted ? "Usuario restringido" : "Acceso restaurado", 
      description: !currentRestricted ? "El usuario no podrá usar la IA hasta que lo habilites." : "El usuario puede volver a usar la IA."
    });
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!db || !confirm('¿Estás seguro de eliminar este perfil?')) return;
    const ref = doc(db, 'users', targetUserId);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Usuario eliminado", description: "El perfil ha sido borrado." });
  };

  const handleSignOut = () => signOut(auth);

  // Función para determinar si un usuario está en línea (últimos 5 minutos)
  const isOnline = (lastLogin: any) => {
    if (!lastLogin) return false;
    const lastLoginDate = lastLogin.seconds ? new Date(lastLogin.seconds * 1000) : new Date(lastLogin);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastLoginDate > fiveMinutesAgo;
  };

  if (isUserLoading || (user && isUserDataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || userData?.status === 'banned') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <Toaster />
        <div className="mb-12 flex items-center gap-4">
          <Film className="w-12 h-12 text-primary" />
          <h1 className="font-headline text-5xl font-black">ReelRecs</h1>
        </div>
        {userData?.status === 'banned' ? (
          <Card className="max-w-md bg-destructive/10 border-destructive">
            <CardHeader className="text-center">
              <Ban className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle>Cuenta Suspendida</CardTitle>
              <p className="text-muted-foreground mt-2">Tu acceso a ReelRecs ha sido restringido por un administrador.</p>
              <Button variant="outline" className="mt-4" onClick={handleSignOut}>Cerrar Sesión</Button>
            </CardHeader>
          </Card>
        ) : (
          <AuthForm />
        )}
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
            {userData?.isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-accent animate-pulse" />
            ) : (
              <UserIcon className="w-4 h-4 text-primary" />
            )}
            <span className="text-sm font-medium">{user.email}</span>
            {userData?.isAdmin && <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex flex-col items-center text-center">
        {userData?.isRestricted && (
          <div className="w-full max-w-2xl mb-6 bg-orange-500/10 border border-orange-500/20 text-orange-500 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-bold">Tu acceso a las recomendaciones de IA ha sido limitado temporalmente por un administrador.</span>
          </div>
        )}
        <h1 className="font-headline text-4xl md:text-6xl font-black mb-4 tracking-tight">
          ¿Qué <span className="text-primary italic">cine</span> te apetece?
        </h1>
        
        <section className="w-full max-w-4xl mt-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-card rounded-2xl border border-border/50 shadow-2xl">
              <Input
                placeholder="Busca por género, humor o películas similares..."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="flex-1 bg-transparent border-none text-lg h-14 focus-visible:ring-0 px-4"
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 md:px-8 bg-primary rounded-xl gap-2 font-bold"
                disabled={loading || !preferences.trim() || userData?.isRestricted}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> Buscar</>}
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Estado de Ánimo</Label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger className="w-[160px] bg-card/40 border-border/30">
                    <SelectValue placeholder="Ánimo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier ánimo</SelectItem>
                    <SelectItem value="Happy">Alegre</SelectItem>
                    <SelectItem value="Sad">Triste</SelectItem>
                    <SelectItem value="Exciting">Acción / Emocionante</SelectItem>
                    <SelectItem value="Scary">Terror / Miedo</SelectItem>
                    <SelectItem value="Romantic">Romántico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Duración</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="w-[160px] bg-card/40 border-border/30">
                    <SelectValue placeholder="Tiempo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier tiempo</SelectItem>
                    <SelectItem value="Under 90 min">Menos de 90 min</SelectItem>
                    <SelectItem value="Under 120 min">Menos de 120 min</SelectItem>
                    <SelectItem value="More than 120 min">Películas largas (+2h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Plataforma</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="w-[160px] bg-card/40 border-border/30">
                    <SelectValue placeholder="Plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier plataforma</SelectItem>
                    <SelectItem value="Netflix">Netflix</SelectItem>
                    <SelectItem value="Disney+">Disney+</SelectItem>
                    <SelectItem value="HBO Max">HBO Max</SelectItem>
                    <SelectItem value="Prime Video">Prime Video</SelectItem>
                    <SelectItem value="Apple TV+">Apple TV+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </section>
      </header>

      <section className="w-full max-w-7xl px-6 pb-24 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-secondary/40 h-12">
              <TabsTrigger value="explore" className="px-6 data-[state=active]:bg-primary">Recomendaciones</TabsTrigger>
              <TabsTrigger value="watchlist" className="px-6 data-[state=active]:bg-primary">Por ver</TabsTrigger>
              <TabsTrigger value="history" className="px-6 data-[state=active]:bg-primary">Historial</TabsTrigger>
              {userData?.isAdmin && (
                <TabsTrigger value="admin" className="px-6 data-[state=active]:bg-accent text-accent data-[state=active]:text-white">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Panel Admin
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="explore">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[2/3] bg-card/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recommendations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {recommendations.movies.map((movie, idx) => {
                  const titleId = getStableId(movie.title);
                  return (
                    <MovieCard 
                      key={titleId} 
                      movie={{...movie, rating: watchedRatingsMap[titleId] || 0}} 
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
                <p className="text-muted-foreground">Usa el buscador para generar recomendaciones</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist">
            {watchlistMovies && watchlistMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {watchlistMovies.map((movie, idx) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={{
                      title: movie.title,
                      posterUrl: movie.posterUrl,
                      synopsis: movie.synopsis || "",
                      year: movie.year,
                      imdbRating: movie.imdbRating,
                      duration: movie.duration,
                      director: movie.director,
                      actors: movie.actors,
                      platforms: movie.platforms || [],
                    }} 
                    index={idx}
                    isInWatchlist={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Tu lista de deseos está vacía</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {watchedMovies && watchedMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {watchedMovies.map((movie, idx) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={{
                      title: movie.title,
                      posterUrl: movie.posterUrl,
                      synopsis: movie.synopsis || "",
                      rating: movie.rating,
                      year: movie.year,
                      imdbRating: movie.imdbRating,
                      duration: movie.duration,
                      director: movie.director,
                      actors: movie.actors,
                      platforms: movie.platforms || [],
                    }} 
                    index={idx}
                    isWatched={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Tu historial está vacío</p>
              </div>
            )}
          </TabsContent>

          {userData?.isAdmin && (
            <TabsContent value="admin">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-card/50 border-border/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Total Usuarios
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-4xl font-black">{allUsers?.length || 0}</span>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50 border-border/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <MessageSquareShare className="w-4 h-4 text-green-500" /> Consultas IA (Hoy)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-4xl font-black">{globalTodayStats?.recommendationRequests || 0}</span>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent" /> Staff
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-4xl font-black">{allUsers?.filter(u => u.isAdmin).length || 0}</span>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card/50 border-border/30">
                  <CardHeader>
                    <CardTitle className="font-headline text-2xl font-bold">Gestión de Usuarios y Seguridad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative overflow-x-auto rounded-xl border border-border/30">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-secondary/40 text-[10px] uppercase font-black text-muted-foreground">
                          <tr>
                            <th className="px-6 py-4">Usuario / ID</th>
                            <th className="px-6 py-4">Consultas</th>
                            <th className="px-6 py-4">Estado / Rol</th>
                            <th className="px-6 py-4">Registro y Conexión</th>
                            <th className="px-6 py-4">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {isLoadingAdmin ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td>
                            </tr>
                          ) : allUsers && allUsers.length > 0 ? (
                            allUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold">{u.email || 'Sin email'}</span>
                                      {isOnline(u.lastLogin) ? (
                                        <div className="flex items-center gap-1 bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                          En línea
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                          <Circle className="w-1.5 h-1.5 fill-muted-foreground" />
                                          Off
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground">{u.id}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-primary" />
                                    <span className="font-black text-lg">{u.recommendationCount || 0}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex gap-1">
                                      {u.isAdmin && <span className="bg-accent/20 text-accent px-2 py-0.5 rounded-full text-[10px] font-bold">ADMIN</span>}
                                      {u.isRestricted && <span className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold">PAUSADO</span>}
                                      {u.status === 'active' && !u.isAdmin && !u.isRestricted && <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full text-[10px] font-bold">ACTIVO</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 text-[10px] text-muted-foreground font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <CalendarDays className="w-3 h-3 text-primary" />
                                      <span>Unido: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Desconocido'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3 h-3 text-accent" />
                                      <span>Última vez: {u.lastLogin ? new Date(u.lastLogin.seconds * 1000).toLocaleString() : 'Pendiente'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className={`h-8 w-8 transition-colors ${u.isRestricted ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`}
                                      onClick={() => handleToggleRestriction(u.id, !!u.isRestricted)}
                                      title={u.isRestricted ? "Habilitar IA" : "Pausar IA"}
                                      disabled={u.id === user.uid}
                                    >
                                      {u.isRestricted ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-muted-foreground hover:text-accent"
                                      onClick={() => handleToggleAdmin(u.id, !!u.isAdmin)}
                                      title={u.isAdmin ? "Quitar Admin" : "Hacer Admin"}
                                      disabled={u.id === user.uid}
                                    >
                                      {u.isAdmin ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                      onClick={() => handleDeleteUser(u.id)}
                                      title="Eliminar Perfil"
                                      disabled={u.id === user.uid}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No hay usuarios registrados</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </section>
    </main>
  );
}

