
'use client';

import { useState } from 'react';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp, initiatePasswordReset } from '@/firebase/non-blocking-login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AuthForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await initiateEmailSignIn(auth, email, password);
    } catch (error: any) {
      let message = "Email o contraseña incorrectos.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Las credenciales no son válidas. Revisa tu email y contraseña.";
      }
      toast({
        title: "Error al entrar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await initiateEmailSignUp(auth, email, password);
    } catch (error: any) {
      let message = "Hubo un problema al crear tu cuenta.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Este email ya está registrado. Intenta iniciar sesión.";
      } else if (error.code === 'auth/weak-password') {
        message = "La contraseña es demasiado débil (mínimo 6 caracteres).";
      } else if (error.code === 'auth/invalid-email') {
        message = "El formato del email no es válido.";
      }
      toast({
        title: "Error al registrarse",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email necesario",
        description: "Escribe tu email arriba para enviarte el enlace de recuperación.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      await initiatePasswordReset(auth, email);
      toast({
        title: "Correo enviado",
        description: "Si el email existe, recibirás instrucciones para cambiar tu contraseña.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo enviar el correo. Inténtalo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-center">Bienvenido a ReelRecs</CardTitle>
        <CardDescription className="text-center">Personaliza tus recomendaciones guardando tus películas</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Registrarse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="tu@email.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    disabled={isResetting || isLoading}
                    className="text-xs text-primary hover:underline font-bold disabled:opacity-50"
                  >
                    {isResetting ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                  </button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input 
                  id="signup-email" 
                  type="email" 
                  placeholder="tu@email.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Contraseña</Label>
                <Input 
                  id="signup-password" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg bg-accent hover:bg-accent/90" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear Cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
