
'use client';

import { useState } from 'react';
import { recommendMovies, type RecommendMoviesOutput } from '@/ai/flows/recommend-movies-flow';
import { MovieCard } from '@/components/movie-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Film, Search, Loader2, Sparkles, Clapperboard, AlertCircle, ExternalLink, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) return;

    setLoading(true);
    setRecommendations(null);
    setErrorStatus(null);

    try {
      const results = await recommendMovies({ preferences });
      setRecommendations(results);
    } catch (error: any) {
      const msg = error.message || "";
      setErrorStatus(msg);
      
      toast({
        title: "Error en la búsqueda",
        description: msg.includes('CONFIG_ERROR') 
          ? "Falta configurar la clave API de Gemini." 
          : "No pudimos conectar con el servicio de recomendaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isConfigError = errorStatus?.includes('CONFIG_ERROR') || errorStatus === null && recommendations === null && !loading;

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
          Tu recomendador de cine con IA. Describe qué te apetece ver y encontraremos tu próxima película favorita.
        </p>

        {/* Search Input Container */}
        <section className="w-full max-w-3xl mt-12 animate-in fade-in zoom-in duration-1000 delay-300">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl group-focus-within:bg-accent/20 transition-colors duration-500 rounded-full -z-10" />
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-card rounded-2xl border border-border shadow-2xl focus-within:border-primary/50 transition-all duration-300">
              <Input
                placeholder="¿Qué te apetece ver? (ej. 'Acción futurista')"
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
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </form>
          
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Thrillers de espías', 'Vibras de verano', 'Ciencia ficción clásica'].map((suggestion) => (
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

      {/* Configuration Guide (Visible if there's no data or an error) */}
      {(errorStatus?.includes('CONFIG_ERROR') || (recommendations === null && !loading)) && (
        <section className="w-full max-w-2xl px-6 mb-12 animate-in fade-in duration-700 delay-500">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Key className="w-5 h-5" />
                ¿Cómo activar ReelRecs?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <p className="text-sm text-muted-foreground">
                Para que la IA funcione, necesitamos conectarla con Google. Sigue estos 3 pasos rápidos:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Haz clic aquí para 
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary font-bold hover:underline mx-1 inline-flex items-center gap-1">
                    obtener tu API Key <ExternalLink className="w-3 h-3" />
                  </a> 
                  (es gratis).
                </li>
                <li>Copia el código que te den (empieza por "AIza...").</li>
                <li>Abre el archivo <b>.env</b> a la izquierda de tu pantalla y pégalo ahí.</li>
              </ol>
              <div className="p-3 bg-card rounded-md border text-xs font-mono text-muted-foreground break-all">
                GOOGLE_GENAI_API_KEY=tu_clave_aqui
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Results Section */}
      <section className="w-full max-w-7xl px-6 pb-24 flex-1">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[2/3] bg-card/50 rounded-2xl animate-pulse flex flex-col">
                <div className="flex-1 bg-muted/20 rounded-t-2xl" />
                <div className="p-6 space-y-4">
                  <div className="h-6 w-3/4 bg-muted/20 rounded" />
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
                Recomendaciones para ti
              </h2>
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
