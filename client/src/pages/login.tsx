import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight } from "lucide-react";
import bgImage from "@assets/generated_images/modern_corporate_architecture_background.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={bgImage} 
          alt="Background" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full flex">
        
        {/* Login Form Section */}
        <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center p-6 md:p-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md space-y-8 bg-background/95 backdrop-blur-xl p-8 md:p-12 rounded-2xl shadow-2xl border border-white/10"
          >
            <div className="space-y-2 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="h-10 w-10 rounded bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                  <span className="font-serif font-bold text-accent-foreground text-2xl">A</span>
                </div>
                <span className="font-serif font-bold text-2xl text-foreground tracking-wide">AgentOne</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Welcome back</h1>
              <p className="text-muted-foreground">
                Enter your credentials to access your workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@agency.com" 
                  className="bg-secondary/50 border-transparent focus:bg-background transition-colors"
                  defaultValue="jane@agency.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-accent hover:text-accent/80">Forgot password?</a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  className="bg-secondary/50 border-transparent focus:bg-background transition-colors"
                  defaultValue="password"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Remember me for 30 days</Label>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
              Need help? <a href="#" className="font-medium text-primary hover:underline">Contact IT Support</a>
            </div>
          </motion.div>
        </div>

        {/* Feature/Marketing Section (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 xl:w-7/12 flex-col justify-end p-16 text-white space-y-6 pb-24">
          <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-accent/20 backdrop-blur-sm border border-accent/30 text-accent font-medium text-sm mb-4">
              New Feature
            </div>
            <h2 className="text-5xl font-serif font-bold leading-tight max-w-2xl mb-4">
              Unified access for the modern agent.
            </h2>
            <p className="text-xl text-slate-300 max-w-xl leading-relaxed">
              Access your leads, listings, and marketing tools from one secure dashboard. Streamline your workflow and close more deals.
            </p>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
