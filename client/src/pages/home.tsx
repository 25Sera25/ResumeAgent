import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Database, Bot, HelpCircle, Settings, Check, Loader2, WandSparkles, FileText, Library, BookOpen, BarChart3, LogOut, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProgressTracker from "@/components/ProgressTracker";
import FileUpload from "@/components/FileUpload";
import JobAnalysis from "@/components/JobAnalysis";
import ResumePreview from "@/components/ResumePreview";
import StoredResumeSelector from "@/components/StoredResumeSelector";
import FollowUpQueue from "@/components/FollowUpQueue";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ResumeSession } from "@shared/schema";

interface SessionStats {
  jobsAnalyzed: number;
  resumesGenerated: number;
  applicationsSent: number;
  followUpsScheduled: number;
}

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  // Get current session data
  const { data: session, isLoading: sessionLoading } = useQuery<ResumeSession>({
    queryKey: ['/api/sessions', currentSessionId],
    enabled: !!currentSessionId,
  });

  // Get overall stats from backend
  const { data: sessionStats } = useQuery<SessionStats>({
    queryKey: ['/api/session-stats'],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the results (React Query v5)
    refetchOnWindowFocus: true,
    initialData: {
      jobsAnalyzed: 0,
      resumesGenerated: 0,
      applicationsSent: 0,
      followUpsScheduled: 0
    }
  });

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/sessions', {
        method: 'POST',
        body: {}
      });
      return response.json();
    },
    onSuccess: (data: ResumeSession) => {
      setCurrentSessionId(data.id);
      toast({
        title: "Session created",
        description: "Ready to upload your resume and start tailoring."
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating session",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Upload resume mutation
  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentSessionId) throw new Error("No active session");
      
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch(`/api/sessions/${currentSessionId}/resume`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', currentSessionId] });
      toast({
        title: "Resume uploaded",
        description: "Your resume has been processed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Analyze job mutation
  const analyzeJobMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      if (!currentSessionId) throw new Error("No active session");
      
      const response = await apiRequest(`/api/sessions/${currentSessionId}/analyze-job`, {
        method: 'POST',
        body: data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/session-stats'] }); // Refresh stats
      toast({
        title: "Job analyzed",
        description: "Job requirements have been extracted and analyzed."
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Tailor resume mutation
  const tailorResumeMutation = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error("No active session");
      
      const response = await apiRequest(`/api/sessions/${currentSessionId}/tailor`, {
        method: 'POST',
        body: {}
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/session-stats'] }); // Refresh stats
      toast({
        title: "Resume tailored",
        description: "Your resume has been optimized for this position."
      });
    },
    onError: (error) => {
      toast({
        title: "Tailoring failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Initialize session on mount
  const handleStartSession = useCallback(() => {
    if (!currentSessionId) {
      createSessionMutation.mutate();
    }
  }, [currentSessionId, createSessionMutation]);

  // File upload handler
  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    uploadResumeMutation.mutate(file);
  }, [uploadResumeMutation]);

  // Job analysis handler
  const handleJobAnalysis = useCallback(async (data: { jobUrl?: string; jobDescription?: string }) => {
    analyzeJobMutation.mutate(data);
  }, [analyzeJobMutation]);

  // Download handler
  const handleDownload = useCallback(async (format: 'pdf' | 'docx') => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${currentSessionId}/download/${format}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored_resume.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: `Your ${format.toUpperCase()} resume is downloading.`
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  }, [currentSessionId, toast]);

  // Get progress steps
  const getProgressSteps = () => {
    if (!session) {
      return [
        { id: 1, title: "Upload Base Resume", description: "DOCX or PDF format", status: 'pending' as const },
        { id: 2, title: "Job URL & Analysis", description: "Parse requirements", status: 'pending' as const },
        { id: 3, title: "AI Resume Tailoring", description: "ATS optimization", status: 'pending' as const },
        { id: 4, title: "Review & Export", description: "DOCX + PDF formats", status: 'pending' as const },
        { id: 5, title: "Auto Apply (Optional)", description: "Submit application", status: 'pending' as const }
      ];
    }

    const hasResume = !!session.baseResumeContent;
    const hasJobAnalysis = !!session.jobAnalysis;
    const hasTailoredContent = !!session.tailoredContent;
    const isAnalyzing = session.status === 'analyzing';
    const isTailoring = session.status === 'tailoring';

    return [
      { 
        id: 1, 
        title: "Upload Base Resume", 
        description: "DOCX or PDF format", 
        status: hasResume ? 'completed' as const : 'current' as const 
      },
      { 
        id: 2, 
        title: "Job URL & Analysis", 
        description: "Parse requirements", 
        status: isAnalyzing ? 'processing' as const : 
                hasJobAnalysis ? 'completed' as const : 
                hasResume ? 'current' as const : 'pending' as const 
      },
      { 
        id: 3, 
        title: "AI Resume Tailoring", 
        description: "ATS optimization", 
        status: isTailoring ? 'processing' as const :
                hasTailoredContent ? 'completed' as const :
                hasJobAnalysis ? 'current' as const : 'pending' as const 
      },
      { 
        id: 4, 
        title: "Review & Export", 
        description: "DOCX + PDF formats", 
        status: hasTailoredContent ? 'current' as const : 'pending' as const 
      },
      { 
        id: 5, 
        title: "Auto Apply (Optional)", 
        description: "Submit application", 
        status: 'pending' as const 
      }
    ];
  };

  // Start session automatically on load
  if (!currentSessionId && !createSessionMutation.isPending) {
    handleStartSession();
  }

  if (sessionLoading || createSessionMutation.isPending) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-neutral-600">Setting up your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-inter bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-800 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <Database className="text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Resume Tailor Agent</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">MS SQL Server DBA Specialist</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/resume-library">
                <Button variant="ghost" size="sm" data-testid="button-resume-library">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Resume Library
                </Button>
              </Link>
              <Link href="/job-tracker">
                <Button variant="ghost" size="sm" data-testid="button-job-tracker">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Job Tracker
                </Button>
              </Link>
              {user?.isAdmin && (
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm" data-testid="button-admin">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" data-testid="button-help">
                <HelpCircle className="text-lg" />
              </Button>
              <Button variant="ghost" size="sm" data-testid="button-settings">
                <Settings className="text-lg" />
              </Button>
              <ThemeToggle />
              <div className="flex items-center gap-2 ml-2 pl-4 border-l border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <User className="w-4 h-4" />
                  <span>{user?.username}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-80 bg-white rounded-xl shadow-sm border border-neutral-200 p-6 h-fit">
            <div className="space-y-6">
              <ProgressTracker steps={getProgressSteps()} />
              
              <hr className="border-neutral-200" />

              {/* Quick Stats */}
              <div>
                <h4 className="text-sm font-medium text-neutral-800 mb-3">Session Stats</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Jobs Analyzed</span>
                    <span className="font-medium text-neutral-800" data-testid="stat-jobs-analyzed">
                      {sessionStats.jobsAnalyzed}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Resumes Generated</span>
                    <span className="font-medium text-neutral-800" data-testid="stat-resumes-generated">
                      {sessionStats.resumesGenerated}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Applications Sent</span>
                    <span className="font-medium text-neutral-800" data-testid="stat-applications-sent">
                      {sessionStats.applicationsSent}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Follow-ups Scheduled</span>
                    <span className="font-medium text-neutral-800" data-testid="stat-followups-scheduled">
                      {sessionStats.followUpsScheduled}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl p-8">
                <div className="flex items-center space-x-4 mb-4">
                  <Bot className="text-3xl" />
                  <div>
                    <h2 className="text-2xl font-bold">AI-Powered Resume Tailoring</h2>
                    <p className="text-blue-100">Specialized for Microsoft SQL Server DBA roles</p>
                  </div>
                </div>
                <p className="text-blue-100 mb-6 leading-relaxed">
                  Upload your base resume and a job posting URL. Our AI agent will analyze the requirements, 
                  extract key skills and keywords, then generate an ATS-optimized resume tailored specifically 
                  for that MS SQL DBA position.
                </p>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <Check className="text-secondary" />
                    <span className="text-sm">ATS-Optimized</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="text-secondary" />
                    <span className="text-sm">Keyword Matching</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="text-secondary" />
                    <span className="text-sm">SQL DBA Focused</span>
                  </div>
                </div>
              </div>

              {/* Step 1: Resume Upload */}
              <Card className="border border-neutral-200 overflow-hidden">
                <CardHeader className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                        1
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800">Upload Base Resume</h3>
                    </div>
                    {!!session?.baseResumeContent && (
                      <div className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
                        <Check className="w-3 h-3 mr-1 inline" />
                        Complete
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Resume Document
                      </label>
                      <FileUpload
                        onFileSelect={handleFileUpload}
                        currentFile={uploadedFile ? {
                          name: uploadedFile.name,
                          size: uploadedFile.size,
                          type: uploadedFile.type
                        } : null}
                        disabled={uploadResumeMutation.isPending}
                      />
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <p className="text-sm text-neutral-600 mb-2">Or use a stored resume:</p>
                        {currentSessionId && (
                          <StoredResumeSelector 
                            sessionId={currentSessionId} 
                            onResumeSelected={() => {
                              queryClient.invalidateQueries({ queryKey: ['/api/sessions', currentSessionId] });
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Profile JSON (Optional)
                      </label>
                      <FileUpload
                        onFileSelect={(file) => {
                          // Handle profile JSON upload
                          console.log('Profile JSON uploaded:', file);
                        }}
                        acceptedTypes={['.json']}
                        disabled={false}
                      />
                    </div>
                  </div>

                  {!!session?.baseResumeContent && (
                    <div className="mt-6">
                      <ResumePreview
                        content={{
                          summary: "Base resume content uploaded successfully",
                          experience: [],
                          skills: []
                        }}
                        isOriginal={true}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Job Analysis */}
              <JobAnalysis
                onAnalyze={handleJobAnalysis}
                result={session?.jobAnalysis ? {
                  title: (session.jobAnalysis as any)?.title,
                  company: (session.jobAnalysis as any)?.company,
                  keywords: (session.jobAnalysis as any)?.keywords as string[],
                  matchScore: session.matchScore || undefined
                } : null}
                isAnalyzing={analyzeJobMutation.isPending || session?.status === 'analyzing'}
              />

              {/* Step 3: AI Tailoring */}
              <Card className={`border border-neutral-200 overflow-hidden ${!session?.jobAnalysis ? 'opacity-60' : ''}`}>
                <CardHeader className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        session?.tailoredContent ? 'bg-primary text-white' : 'bg-neutral-300 text-neutral-500'
                      }`}>
                        3
                      </div>
                      <h3 className={`text-lg font-semibold ${
                        session?.tailoredContent ? 'text-neutral-800' : 'text-neutral-600'
                      }`}>
                        AI Resume Tailoring
                      </h3>
                    </div>
                    {session?.tailoredContent ? (
                      <div className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
                        <Check className="w-3 h-3 mr-1 inline" />
                        Complete
                      </div>
                    ) : session?.status === 'tailoring' ? (
                      <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                        <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />
                        Processing
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-neutral-200 text-neutral-600 text-xs font-medium rounded-full">
                        Waiting
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {session?.jobAnalysis && !session?.tailoredContent && session?.status !== 'tailoring' ? (
                    <div className="text-center py-8">
                      <WandSparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-neutral-800 mb-2">Ready to Tailor</h4>
                      <p className="text-sm text-neutral-600 mb-6 max-w-md mx-auto">
                        Your resume and job analysis are complete. Start AI tailoring to optimize your resume for this position.
                      </p>
                      <Button
                        onClick={() => tailorResumeMutation.mutate()}
                        disabled={tailorResumeMutation.isPending}
                        data-testid="button-start-tailoring"
                      >
                        {tailorResumeMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Tailoring Resume...
                          </>
                        ) : (
                          <>
                            <WandSparkles className="w-4 h-4 mr-2" />
                            Start AI Tailoring
                          </>
                        )}
                      </Button>
                    </div>
                  ) : session?.tailoredContent ? (
                    <ResumePreview
                      content={session.tailoredContent}
                      isOriginal={false}
                      onDownload={handleDownload}
                      sessionId={currentSessionId || undefined}
                      onSaveToLibrary={() => {
                        toast({
                          title: "Resume Saved!",
                          description: "You can view and manage it in the Resume Library",
                          variant: "default",
                        });
                      }}
                    />
                  ) : session?.status === 'tailoring' ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                      <h4 className="text-lg font-medium text-neutral-800 mb-2">AI is Tailoring Your Resume</h4>
                      <p className="text-sm text-neutral-600">This may take a few moments...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <WandSparkles className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-neutral-600 mb-2">AI Tailoring Ready</h4>
                      <p className="text-sm text-neutral-500 max-w-md mx-auto">
                        Complete the job analysis above to proceed with AI-powered resume optimization
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        {/* Follow-Up Queue Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FollowUpQueue compact />
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" data-testid="button-save-progress">
                Save Progress
              </Button>
              <Button variant="ghost" data-testid="button-load-previous">
                Load Previous
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="ghost" data-testid="button-reset">
                Reset All
              </Button>
              <Button 
                disabled={!session?.jobAnalysis || session?.status === 'tailoring' || tailorResumeMutation.isPending}
                onClick={() => {
                  if (session?.tailoredContent) {
                    handleDownload('pdf');
                  } else {
                    tailorResumeMutation.mutate();
                  }
                }}
                data-testid="button-continue"
              >
                {session?.tailoredContent ? "Download Resume" : "Continue to Tailoring"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
