'use client';

import { useState, useEffect } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Film, Search, Loader2, Sparkles, Key, ExternalLink, ShieldCheck, Settings2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [preferences, setPreferences] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar la clave desde localStorage al inicio
  useEffect(() => {
    const savedKey = localStorage.getItem('recrecs_api_key');
    if (savedKey) {
      setManualKey(savedKey);
    } else {
      setShowKeyConfig(true);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) return;

    setLoading(true);
    setRecommendations(null);
    setErrorStatus(null);

    try {
      // Guardar la clave si se ha modificado
      if (manualKey) {
        localStorage.setItem('recrecs_api_key', manualKey);
      }

      const results = await recommendMovies({ 
        preferences, 
        apiKey: manualKey 
      });
      setRecommendations(results);
      setShowKeyConfig(false); // Ocultar config si funciona
    } catch (error: any) {
      const msg = error.message || "";
      setErrorStatus(msg);
      
      if (msg.includes('CONFIG_ERROR')) {
        setShowKeyConfig(true);
      }

      toast({
        title: "Error en la búsqueda",
        description: msg.includes('CONFIG_ERROR') 
          ? "La clave API parece no ser válida." 
          : "No pudimos obtener recomendaciones. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearKey = () => {
    localStorage.removeItem('recrecs_api_key');
    setManualKey('');
    setShowKeyConfig(true);
    toast({
      description: "Clave API eliminada correctamente.",
    });
  };

  return (
    <main className="min-h-screen bg-background selection:bg-accent/30 flex flex-col items-center">
      <Toaster />
      
      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top duration-700">
          <div className="p-3 rounded-full bg-primary/20 text-primary border border-primary/20">
            <Film className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-foreground">
            Reel<span className="text-primary">Recs</span>
          </h1>
        </div>
        <p className="font-body text-xl text-muted-foreground max-w-2xl mb-8">
          Tu recomendador de cine con IA. Describe qué te apetece ver y encontraremos tu próxima película favorita.
        </p>

        {/* Botón de Ajustes de Clave (Solo si ya hay una guardada y no se está mostrando el panel) */}
        {!showKeyConfig && manualKey && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowKeyConfig(true)}
            className="mb-4 text-muted-foreground hover:text-foreground gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Configuración de Clave API
          </Button>
        )}

        {/* Sección de Clave API */}
        {showKeyConfig && (
          <section className="w-full max-w-xl mt-4 mb-8 animate-in zoom-in duration-300">
            <Card className="border-accent/40 bg-accent/5 relative overflow-hidden">
              <button 
                onClick={() => setShowKeyConfig(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-accent">
                  <Key className="w-4 h-4" />
                  Configura tu acceso a Gemini
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Pega aquí tu código AIza..."
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    className="flex-1 bg-background border-accent/20 focus-visible:ring-accent"
                    type="password"
                  />
                  <Button onClick={() => setShowKeyConfig(false)} variant="secondary" className="px-6">
                    Listo
                  </Button>
                </div>
                <div className="flex flex-col gap-2 text-left">
                  <p className="text-[10px] text-muted-foreground">
                    Consíguelo gratis en 
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
                      Google AI Studio <ExternalLink className="w-2 h-2" />
                    </a> 
                    con <b>"Create API key in new project"</b>.
                  </p>
                  {manualKey && (
                    <button onClick={clearKey} className="text-[10px] text-destructive hover:underline text-left w-fit">
                      Borrar clave guardada
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Buscador */}
        <section className="w-full max-w-3xl">
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-card rounded-2xl border border-border shadow-2xl focus-within:border-primary/50 transition-all duration-300">
              <Input
                placeholder="¿Qué te apetece ver? (ej. 'Acción futurista con un toque retro')"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="flex-1 bg-transparent border-none text-lg h-14 focus-visible:ring-0 px-6"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 md:px-8 bg-primary hover:bg-primary/90 font-bold rounded-xl gap-2"
                disabled={loading || !preferences.trim()}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-accent" />
                    Encontrar Películas
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[2/3] bg-card/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {recommendations && !loading && (
          <div className="mt-8 animate-in fade-in duration-500">
            <h2 className="font-headline text-3xl font-bold mb-8 flex items-center gap-3">
              <Search className="w-6 h-6 text-primary" />
              Recomendaciones para ti
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recommendations.movies.map((movie, idx) => (
                <MovieCard key={`${movie.title}-${idx}`} movie={movie} index={idx} />
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="w-full py-8 border-t border-border/50 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 text-green-500/70">
          <ShieldCheck className="w-3 h-3" />
          Clave guardada localmente de forma segura.
        </div>
        <p>© {new Date().getFullYear()} ReelRecs. IA para cinéfilos.</p>
      </footer>
    </main>
  );
}