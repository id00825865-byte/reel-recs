
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
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, increment, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

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
  }, [db, user?.uid]);
  
  const { data: userData } = useDoc(userDocRef);

  // Lógica de administrador estricta por base de datos
  const isAdmin = useMemo(() => userData?.isAdmin === true, [userData?.isAdmin]);

  // Sincronización del perfil (No destructiva)
  useEffect(() => {
    if (user && db) {
      const userRef = doc(db, 'users', user.uid);
      
      const syncProfile = async () => {
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              id: user.uid,
              email: user.email,
              createdAt: new Date().toISOString(),
              lastLogin: serverTimestamp(),
              isAdmin: false,
              status: 'active',
              recommendationCount: 0,
              isRestricted: false,
            });
          } else {
            await setDoc(userRef, {
              email: user.email,
              lastLogin: serverTimestamp(),
            }, { merge: true });
          }
        } catch (e) {
          console.error("Error syncing profile:", e);
        }
      };

      syncProfile();
    }
  }, [user, db]);

  // Consultas de películas
  const watchedMoviesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'watchedMovies'), orderBy('watchedAt', 'desc'));
  }, [db, user?.uid]);
  const { data: watchedMovies } = useCollection(watchedMoviesQuery);
  
  const watchlistQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'watchlist'), orderBy('addedAt', 'desc'));
  }, [db, user?.uid]);
  const { data: watchlistMovies } = useCollection(watchlistQuery);

  // Panel Admin - Consulta de todos los usuarios
  const allUsersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, 'users');
  }, [db, isAdmin]);
  const { data: rawUsers, isLoading: isLoadingAdmin } = useCollection(allUsersQuery);

  const allUsers = useMemo(() => {
    if (!rawUsers || !user) return [];
    return [...rawUsers].sort((a, b) => {
      if (a.id === user.uid) return -1;
      if (b.id === user.uid) return 1;
      const dateA = a.lastLogin instanceof Timestamp ? a.lastLogin.toDate().getTime() : 0;
      const dateB = b.lastLogin instanceof Timestamp ? b.lastLogin.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [rawUsers, user?.uid]);

  const statsDocRef = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return doc(db, 'globalStats', todayStr);
  }, [db, isAdmin, todayStr]);
  const { data: globalTodayStats } = useDoc(statsDocRef);

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
      toast({ title: "Acceso restringido", description: "No puedes usar la IA en este momento.", variant: "destructive" });
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
        setDocumentNonBlocking(userRef, { recommendationCount: increment(1) }, { merge: true });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = (targetUserId: string, currentStatus: boolean) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'users', targetUserId), { isAdmin: !currentStatus });
    toast({ title: "Permisos actualizados" });
  };

  const handleToggleRestriction = (targetUserId: string, currentRestricted: boolean) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'users', targetUserId), { isRestricted: !currentRestricted });
    toast({ title: !currentRestricted ? "IA Pausada" : "IA Habilitada" });
  };

  const handleToggleStatus = (targetUserId: string, currentStatus: string) => {
    if (!db) return;
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    updateDocumentNonBlocking(doc(db, 'users', targetUserId), { status: newStatus });
    toast({ title: newStatus === 'banned' ? "Usuario baneado" : "Usuario activado" });
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!db || !confirm('¿Eliminar usuario definitivamente?')) return;
    deleteDocumentNonBlocking(doc(db, 'users', targetUserId));
    toast({ title: "Usuario eliminado" });
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      setActiveTab('explore');
      setRecommendations(null);
    });
  };

  const isOnline = (lastLogin: any) => {
    if (!lastLogin) return false;
    const lastLoginDate = lastLogin instanceof Timestamp ? lastLogin.toDate() : new Date(lastLogin);
    return (Date.now() - lastLoginDate.getTime()) < 5 * 60 * 1000;
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (userData?.status === 'banned' && !isAdmin)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <Toaster />
        <div className="mb-12 flex items-center gap-4">
          <Film className="w-12 h-12 text-primary" />
          <h1 className="font-headline text-5xl font-black">ReelRecs</h1>
        </div>
        {userData?.status === 'banned' ? (
          <Card className="max-w-md border-destructive bg-destructive/5">
            <CardHeader className="text-center">
              <Ban className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle>Acceso Denegado</CardTitle>
              <p className="text-muted-foreground mt-2">Tu cuenta ha sido suspendida.</p>
              <Button variant="outline" className="mt-4" onClick={handleSignOut}>Cerrar Sesión</Button>
            </CardHeader>
          </Card>
        ) : <AuthForm />}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Toaster />
      <nav className="border-b border-border/10 bg-card/30 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('explore')}>
          <Film className="w-6 h-6 text-primary" />
          <span className="font-headline text-2xl font-bold">ReelRecs</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
            {isAdmin ? <ShieldCheck className="w-4 h-4 text-accent" /> : <UserIcon className="w-4 h-4 text-primary" />}
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="w-5 h-5" /></Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          {userData?.isRestricted && (
            <div className="mb-6 inline-flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full text-sm font-bold border border-orange-500/20">
              <AlertTriangle className="w-4 h-4" /> IA Pausada por administración
            </div>
          )}
          <h1 className="font-headline text-4xl md:text-6xl font-black mb-4">¿Qué te apetece <span className="text-primary italic">ver</span> hoy?</h1>
          
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto mt-8 space-y-4">
            <div className="flex gap-2 p-2 bg-card rounded-2xl border border-border/50 shadow-xl">
              <Input
                placeholder="Busca por género, humor o películas similares..."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="bg-transparent border-none text-lg h-12 focus-visible:ring-0"
              />
              <Button type="submit" disabled={loading || !preferences.trim() || userData?.isRestricted} className="h-12 px-6">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ánimo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquier ánimo</SelectItem>
                  <SelectItem value="Happy">Alegre</SelectItem>
                  <SelectItem value="Sad">Triste</SelectItem>
                  <SelectItem value="Exciting">Emocionante</SelectItem>
                </SelectContent>
              </Select>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Duración" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquier tiempo</SelectItem>
                  <SelectItem value="Under 90 min">Cortas</SelectItem>
                  <SelectItem value="More than 120 min">Largas (+2h)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquier sitio</SelectItem>
                  <SelectItem value="Netflix">Netflix</SelectItem>
                  <SelectItem value="Prime Video">Prime Video</SelectItem>
                  <SelectItem value="HBO Max">HBO Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex justify-center mb-8 bg-transparent gap-2">
            <TabsTrigger value="explore" className="rounded-full px-6 data-[state=active]:bg-primary">Explorar</TabsTrigger>
            <TabsTrigger value="watchlist" className="rounded-full px-6 data-[state=active]:bg-primary">Por ver</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full px-6 data-[state=active]:bg-primary">Historial</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="rounded-full px-6 data-[state=active]:bg-accent text-accent data-[state=active]:text-white">
                <ShieldCheck className="w-4 h-4 mr-2" /> Administración
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="explore">
            {recommendations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.movies.map((m, i) => (
                  <MovieCard 
                    key={getStableId(m.title)} 
                    movie={{...m, rating: watchedRatingsMap[getStableId(m.title)] || 0}} 
                    index={i}
                    isWatched={watchedIds.includes(getStableId(m.title))}
                    isInWatchlist={watchlistIds.includes(getStableId(m.title))}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <Sparkle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Usa el buscador para ver recomendaciones</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist">
            {watchlistMovies?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {watchlistMovies.map((m, i) => <MovieCard key={m.id} movie={m} index={i} isInWatchlist={true} />)}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Tu lista de deseos está vacía</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {watchedMovies?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {watchedMovies.map((m, i) => <MovieCard key={m.id} movie={m} index={i} isWatched={true} />)}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Tu historial está vacío</p>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-card/50 border-border/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Usuarios Totales</CardTitle></CardHeader>
                  <CardContent><span className="text-4xl font-black">{allUsers.length}</span></CardContent>
                </Card>
                <Card className="bg-card/50 border-border/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Consultas IA Hoy</CardTitle></CardHeader>
                  <CardContent><span className="text-4xl font-black">{globalTodayStats?.recommendationRequests || 0}</span></CardContent>
                </Card>
                <Card className="bg-card/50 border-border/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Staff</CardTitle></CardHeader>
                  <CardContent><span className="text-4xl font-black">{allUsers.filter(u => u.isAdmin).length}</span></CardContent>
                </Card>
              </div>

              <Card className="bg-card/50 border-border/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/40 text-[10px] uppercase font-black text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Uso IA</th>
                        <th className="px-6 py-4">Configuración / Estado</th>
                        <th className="px-6 py-4">Última Vez</th>
                        <th className="px-6 py-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {allUsers.map((u) => (
                        <tr key={u.id} className={cn("hover:bg-secondary/10 transition-colors", u.id === user.uid && "bg-primary/5")}>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{u.email}</span>
                                {u.id === user.uid && <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">TÚ</span>}
                                {isOnline(u.lastLogin) && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="En línea" />}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{u.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-primary" />
                              <span className="font-black text-lg">{u.recommendationCount || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {u.isAdmin ? (
                                <Badge className="bg-accent text-white text-[9px] font-bold px-2 py-0.5 border-none">ADMIN</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5">USUARIO</Badge>
                              )}
                              <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border-none", u.isRestricted ? "bg-orange-500" : "bg-green-600")}>
                                {u.isRestricted ? "IA PAUSADA" : "IA ACTIVA"}
                              </Badge>
                              <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border-none", u.status === 'banned' ? "bg-red-600" : "bg-blue-600")}>
                                {u.status === 'banned' ? "BANEADO" : "ACTIVO"}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-muted-foreground">
                            {u.lastLogin ? (u.lastLogin instanceof Timestamp ? u.lastLogin.toDate().toLocaleString() : new Date(u.lastLogin).toLocaleString()) : 'Nunca'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleRestriction(u.id, !!u.isRestricted)} title="Restringir IA">
                                {u.isRestricted ? <Zap className="w-4 h-4 text-green-500" /> : <ZapOff className="w-4 h-4 text-orange-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleAdmin(u.id, !!u.isAdmin)} disabled={u.id === user.uid} title="Cambiar Rol">
                                {u.isAdmin ? <UserMinus className="w-4 h-4 text-muted-foreground" /> : <UserPlus className="w-4 h-4 text-accent" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleStatus(u.id, u.status)} disabled={u.id === user.uid} title="Banear/Activar">
                                {u.status === 'banned' ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : <Ban className="w-4 h-4 text-red-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteUser(u.id)} disabled={u.id === user.uid} title="Borrar">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}
