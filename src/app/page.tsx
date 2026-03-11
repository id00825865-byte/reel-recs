'use client';

import { useState, useEffect } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Film, Search, Loader2, Sparkles, Key, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [preferences, setPreferences] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const { toast } = useToast();

  // Intentar cargar la clave desde localStorage al inicio
  useEffect(() => {
    const savedKey = localStorage.getItem('recrecs_api_key');
    if (savedKey) setManualKey(savedKey);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) return;

    setLoading(true);
    setRecommendations(null);
    setErrorStatus(null);

    try {
      // Guardar la clave manualmente si se introduce
      if (manualKey) {
        localStorage.setItem('recrecs_api_key', manualKey);
      }

      const results = await recommendMovies({ 
        preferences, 
        apiKey: manualKey 
      });
      setRecommendations(results);
    } catch (error: any) {
      const msg = error.message || "";
      setErrorStatus(msg);
      
      toast({
        title: "Error en la búsqueda",
        description: msg.includes('CONFIG_ERROR') 
          ? "Falta la clave API o es inválida." 
          : "No pudimos obtener recomendaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isConfigError = errorStatus?.includes('CONFIG_ERROR') || (!manualKey && recommendations === null && !loading);

  return (
    <main className="min-h-screen bg-background selection:bg-accent/30 flex flex-col items-center">
      <Toaster />
      
      <header className="w-full max-w-7xl px-6 pt-16 pb-8 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top duration-700">
          <div className="p-3 rounded-full bg-primary/20 text-primary border border-primary/20">
            <Film className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-foreground">
            Reel<span className="text-primary">Recs</span>
          </h1>
        </div>
        <p className="font-body text-xl text-muted-foreground max-w-2xl">
          Tu recomendador de cine con IA. Describe qué te apetece ver y encontraremos tu próxima película favorita.
        </p>

        {/* Sección de Clave API (Solo si no hay una clave guardada o hay error) */}
        {isConfigError && (
          <section className="w-full max-w-xl mt-8 animate-in zoom-in duration-500">
            <Card className="border-accent/40 bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-accent">
                  <Key className="w-4 h-4" />
                  Paso Final: Pega tu código aquí
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Pega aquí tu código AIza..."
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    className="bg-background border-accent/20 focus-visible:ring-accent"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-left">
                  Si no tienes el código, consíguelo gratis en 
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
                    Google AI Studio <ExternalLink className="w-2 h-2" />
                  </a> 
                  usando el botón <b>"Create API key in new project"</b>.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Search Input Container */}
        <section className="w-full max-w-3xl mt-10">
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-card rounded-2xl border border-border shadow-2xl focus-within:border-primary/50 transition-all duration-300">
              <Input
                placeholder="¿Qué te apetece ver? (ej. 'Acción futurista')"
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
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      </header>

      {/* Results Section */}
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
          Tu clave se guarda solo en este navegador.
        </div>
        <p>© {new Date().getFullYear()} ReelRecs. IA para cinéfilos.</p>
      </footer>
    </main>
  );
}
