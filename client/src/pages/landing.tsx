import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Zap, Users, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        const data = await response.json();
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      if (response.ok) {
        toast({
          title: "Reset link sent",
          description: "If an account with that email exists, a password reset link has been sent.",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to send reset email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,13%,13%)] text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,13%,10%)] via-[hsl(220,13%,13%)] to-[hsl(220,13%,18%)]" />
      
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#EF4923] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#D4401F] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        <header className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/spyglass-logo.png" 
              alt="Spyglass Realty" 
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
              <span className="font-display font-bold text-xl text-white">Mission Control</span>
            </div>
          </div>
          
        </header>

        <main className="container mx-auto px-6 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <span className="h-2 w-2 rounded-full bg-[#EF4923] animate-pulse" />
              Spyglass Agent Portal
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              Welcome to
              <br />
              <span className="text-gradient-orange">Mission Control</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed">
              Your unified command center for every tool, resource, and training you need to close deals and grow your business.
            </p>

            <div className="max-w-md mx-auto">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-center">Sign In</CardTitle>
                  <CardDescription className="text-white/70 text-center">
                    Access your Mission Control account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showForgotPassword ? (
                    <Tabs defaultValue="google" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-white/10 border-white/20">
                        <TabsTrigger value="google" className="data-[state=active]:bg-white/20">Google</TabsTrigger>
                        <TabsTrigger value="email" className="data-[state=active]:bg-white/20">Email</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="google" className="space-y-4">
                        <a href="/api/auth/google">
                          <Button 
                            size="lg" 
                            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 shadow-lg flex items-center justify-center gap-3"
                            data-testid="button-google-login"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                          </Button>
                        </a>
                      </TabsContent>
                      
                      <TabsContent value="email" className="space-y-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-white">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="your@email.com"
                              value={loginForm.email}
                              onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                              required
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="password" className="text-white">Password</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                                required
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-white/70" />
                                ) : (
                                  <Eye className="h-4 w-4 text-white/70" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#EF4923] hover:bg-[#D4401F] text-white font-semibold py-3"
                          >
                            {isLoading ? "Signing in..." : "Sign In"}
                          </Button>
                          
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-sm text-white/70 hover:text-white underline"
                            >
                              Forgot your password?
                            </button>
                          </div>
                        </form>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-white font-semibold mb-2">Reset Password</h3>
                        <p className="text-white/70 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
                      </div>
                      
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-white">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="your@email.com"
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                        </div>
                        
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-[#EF4923] hover:bg-[#D4401F] text-white font-semibold py-3"
                        >
                          {isLoading ? "Sending..." : "Send Reset Link"}
                        </Button>
                        
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(false)}
                            className="text-sm text-white/70 hover:text-white underline"
                          >
                            Back to sign in
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto"
          >
            {[
              {
                icon: Zap,
                title: "All Your Tools",
                description: "Access training, marketing, CRM, and more from a single dashboard."
              },
              {
                icon: Shield,
                title: "Secure Access",
                description: "Sign in with your Google Workspace account for seamless, secure authentication."
              },
              {
                icon: Users,
                title: "Team Connected",
                description: "Stay updated with company announcements and team resources."
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-[#EF4923]/20 flex items-center justify-center mb-5">
                  <feature.icon className="h-6 w-6 text-[#EF4923]" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </motion.div>
        </main>

        <footer className="container mx-auto px-6 py-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/50 text-sm">
            <div className="flex items-center gap-2">
              <img src="/spyglass-logo.png" alt="Spyglass" className="h-6 w-auto opacity-70" />
              <span>Spyglass Realty</span>
            </div>
            <p>Austin's Top Real Estate Brokerage</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
