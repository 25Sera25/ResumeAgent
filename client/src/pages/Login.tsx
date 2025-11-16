import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Sparkles, Target, Calendar } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading, login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to home if already authenticated
  // This runs after React finishes updating the user state
  useEffect(() => {
    if (!loading && user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      await login(values.username, values.password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      // Don't manually navigate here - let the useEffect handle it
      // after React finishes updating the user state
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Login failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero Section - Left Side */}
      <div className="relative flex-1 lg:flex items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 via-transparent to-blue-600/20"></div>
        
        {/* Content */}
        <div className="relative z-10 max-w-lg space-y-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-white" />
              <h1 className="text-4xl lg:text-5xl font-bold text-white">
                ResumeAgent
              </h1>
            </div>
            <h2 className="text-2xl lg:text-3xl font-semibold text-white/90">
              Your personal SQL Server DBA job-search cockpit
            </h2>
            <p className="text-lg text-white/80">
              Tailor resumes, track applications, and prepare for interviews in one focused workspace.
            </p>
          </div>

          {/* Value Bullets */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold">AI‑tailored resumes per posting</h3>
                <p className="text-white/70 text-sm">
                  Generate customized resumes that match each job description perfectly
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Target className="h-6 w-6 text-blue-300 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold">Application tracking with follow-ups</h3>
                <p className="text-white/70 text-sm">
                  Never miss a deadline with organized tracking and automated reminders
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Calendar className="h-6 w-6 text-purple-300 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold">Interview Prep Hub</h3>
                <p className="text-white/70 text-sm">
                  Practice with job-specific questions and craft compelling STAR stories
                </p>
              </div>
            </div>
          </div>

          {/* Stats Card - Glassmorphism */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-white">250+</div>
                <div className="text-sm text-white/70">Resumes Tailored</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">89</div>
                <div className="text-sm text-white/70">Interviews</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">32</div>
                <div className="text-sm text-white/70">Offers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form - Right Side */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Continue where you left off with your applications
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 dark:text-slate-100">
                        Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          autoComplete="username"
                          disabled={isLoading}
                          className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 dark:text-slate-100">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Secure access to your job search dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
