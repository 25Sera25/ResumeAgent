import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  ArrowLeft, 
  Loader2, 
  MessageSquare, 
  BookOpen, 
  Star,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Calendar,
  Save,
  FolderOpen,
  Plus
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

interface InterviewPrepQuestion {
  id: string;
  question: string;
  type: 'technical' | 'behavioral';
  topic: string;
  difficulty: 'junior' | 'mid' | 'senior';
  suggestedAnswer: string;
  star?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

interface SkillExplanation {
  skill: string;
  levels: Array<{
    label: '30s' | '2min' | 'deepDive';
    text: string;
  }>;
  pitfalls: string[];
  examplesFromResume?: string[];
}

interface StarStory {
  id: string;
  title: string;
  skill: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  conciseVersion: string;
  extendedVersion: string;
}

export default function InterviewPrep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  
  // Parse query params
  const searchParams = new URLSearchParams(window.location.search);
  const jobId = searchParams.get('jobId');
  const skill = searchParams.get('skill');
  
  const [focusMode, setFocusMode] = useState<'job' | 'skill' | 'general'>(
    jobId ? 'job' : skill ? 'skill' : 'general'
  );
  const [questions, setQuestions] = useState<InterviewPrepQuestion[]>([]);
  const [skills, setSkills] = useState<SkillExplanation[]>([]);
  const [stories, setStories] = useState<StarStory[]>([]);
  
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());
  const [practiceStatus, setPracticeStatus] = useState<Map<string, 'needs-practice' | 'confident'>>(new Map());
  
  // Session management state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionCompany, setNewSessionCompany] = useState('');
  const [newSessionJobTitle, setNewSessionJobTitle] = useState('');
  const [newSessionJobDescription, setNewSessionJobDescription] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('none');
  
  // Fetch all sessions for current user
  const { data: sessions = [], refetch: refetchSessions } = useQuery<any[]>({
    queryKey: ['/api/interview-sessions'],
    enabled: !!user,
  });
  
  // Fetch saved resumes from Resume Library
  const { data: savedResumes = [] } = useQuery<any[]>({
    queryKey: ['/api/tailored-resumes'],
    enabled: !!user,
  });
  
  // Fetch current session data
  const { data: currentSession, refetch: refetchCurrentSession } = useQuery<any>({
    queryKey: ['/api/interview-sessions', currentSessionId],
    enabled: !!currentSessionId,
  });
  
  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      mode: string; 
      jobId?: string; 
      skill?: string;
      companyName?: string;
      jobTitle?: string;
      jobDescription?: string;
    }) => {
      const response = await apiRequest('/api/interview-sessions', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to create session');
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      refetchSessions();
      toast({
        title: "Session created",
        description: `"${data.name}" is now active`,
      });
    },
  });
  
  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const response = await apiRequest(`/api/interview-sessions/${data.id}`, {
        method: 'PUT',
        body: data.updates,
      });
      if (!response.ok) throw new Error('Failed to update session');
      return response.json();
    },
  });
  
  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/interview-sessions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete session');
      return response.json();
    },
    onSuccess: () => {
      refetchSessions();
      setCurrentSessionId(null);
      toast({
        title: "Session deleted",
        description: "Interview session removed",
      });
    },
  });
  
  // Load session data when currentSession changes
  useEffect(() => {
    if (currentSession) {
      console.log('[INTERVIEW_PREP] Loading session data:', currentSession.id);
      if (currentSession.questions) {
        setQuestions(currentSession.questions);
      }
      if (currentSession.skillExplanations) {
        setSkills(currentSession.skillExplanations);
      }
      if (currentSession.starStories) {
        setStories(currentSession.starStories);
      }
      if (currentSession.practiceStatus) {
        setPracticeStatus(new Map(Object.entries(currentSession.practiceStatus)));
      }
      if (currentSession.mode) {
        setFocusMode(currentSession.mode);
      }
    }
  }, [currentSession]);
  
  // Auto-save session data when it changes
  useEffect(() => {
    if (currentSessionId && (questions.length > 0 || skills.length > 0 || stories.length > 0)) {
      const timeoutId = setTimeout(() => {
        console.log('[INTERVIEW_PREP] Auto-saving session data');
        updateSessionMutation.mutate({
          id: currentSessionId,
          updates: {
            questions,
            skillExplanations: skills,
            starStories: stories,
            practiceStatus: Object.fromEntries(practiceStatus.entries()),
          },
        });
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [questions, skills, stories, practiceStatus, currentSessionId]);
  
  // Load practice status from localStorage on mount (fallback for legacy data)
  useEffect(() => {
    const savedStatus = localStorage.getItem('interview-prep-practice-status');
    if (savedStatus && !currentSessionId) {
      try {
        const parsed = JSON.parse(savedStatus);
        setPracticeStatus(new Map(Object.entries(parsed)));
      } catch (error) {
        console.error('Failed to parse practice status from localStorage:', error);
      }
    }
  }, []);
  
  // Save practice status to localStorage whenever it changes (legacy backup)
  useEffect(() => {
    if (practiceStatus.size > 0) {
      const statusObj = Object.fromEntries(practiceStatus.entries());
      localStorage.setItem('interview-prep-practice-status', JSON.stringify(statusObj));
    }
  }, [practiceStatus]);
  
  // Fetch job/resume context if jobId is provided
  const { data: jobContext } = useQuery<any>({
    queryKey: ['/api/tailored-resumes', jobId],
    enabled: !!jobId && focusMode === 'job',
  });

  // Fetch skills insights for general mode
  const { data: skillsInsights } = useQuery<any>({
    queryKey: ['/api/insights/skills'],
    enabled: focusMode === 'general',
  });

  useEffect(() => {
    // Auto-load on mount based on mode
    if (focusMode === 'job' && jobId) {
      fetchQuestions();
      fetchSkills();
      fetchStories();
    } else if (focusMode === 'skill' && skill) {
      fetchQuestions();
      fetchSkills();
    }
  }, []);

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const payload: any = { mode: focusMode };
      
      // Include session ID if available for job description context
      if (currentSessionId) {
        payload.sessionId = currentSessionId;
      }
      
      // Only include jobId or skill if they exist and match the mode
      if (focusMode === 'job' && jobId) {
        payload.jobId = jobId;
      } else if (focusMode === 'skill' && skill) {
        payload.skill = skill;
      } else if (focusMode === 'general' && skillsInsights?.topRequestedSkills) {
        // Pass top skills from Skills Gap Dashboard to use in question generation
        payload.skillsContext = skillsInsights.topRequestedSkills.slice(0, 10).map((s: any) => ({
          name: s.skill,
          category: s.category,
          coverage: s.coveragePercent,
          jobCount: s.jobsMentioned
        }));
      }
      
      const response = await apiRequest('/api/interview-prep/questions', {
        method: 'POST',
        body: payload
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate questions');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate interview questions",
        variant: "destructive"
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchSkills = async () => {
    setLoadingSkills(true);
    try {
      const payload: any = { mode: focusMode };
      
      // Only include jobId or skills if they exist and match the mode
      if (focusMode === 'job' && jobId) {
        payload.jobId = jobId;
      } else if (focusMode === 'skill' && skill) {
        payload.skills = [skill];
      } else if (focusMode === 'general' && skillsInsights?.topRequestedSkills) {
        // Pass top skills from Skills Gap Dashboard
        payload.skills = skillsInsights.topRequestedSkills.slice(0, 8).map((s: any) => s.skill);
      }
      
      const response = await apiRequest('/api/interview-prep/skills-explanations', {
        method: 'POST',
        body: payload
      });
      
      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate skill explanations');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate skill explanations",
        variant: "destructive"
      });
    } finally {
      setLoadingSkills(false);
    }
  };

  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const payload: any = { mode: focusMode };
      
      // Only include jobId or skill if they exist and match the mode
      if (focusMode === 'job' && jobId) {
        payload.jobId = jobId;
      } else if (focusMode === 'skill' && skill) {
        payload.skill = skill;
      }
      
      const response = await apiRequest('/api/interview-prep/star-stories', {
        method: 'POST',
        body: payload
      });
      
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error for no resume content
        if (errorData.error === 'no_resume_content') {
          throw new Error(errorData.message || 'No resume content found. Please tailor and save at least one resume, then try again.');
        }
        
        throw new Error(errorData.message || 'Failed to generate STAR stories');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate STAR stories",
        variant: "destructive"
      });
    } finally {
      setLoadingStories(false);
    }
  };

  const toggleQuestion = (id: string) => {
    const newOpen = new Set(openQuestions);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenQuestions(newOpen);
  };

  const togglePracticeStatus = (id: string) => {
    const newStatus = new Map(practiceStatus);
    const current = newStatus.get(id);
    if (current === 'needs-practice') {
      newStatus.set(id, 'confident');
    } else if (current === 'confident') {
      newStatus.delete(id);
    } else {
      newStatus.set(id, 'needs-practice');
    }
    setPracticeStatus(newStatus);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive"
      });
    }
  };

  const handleResumeSelection = async (resumeId: string) => {
    setSelectedResumeId(resumeId);
    
    if (!resumeId || resumeId === 'none') {
      // Clear fields if "None" is selected
      setNewSessionCompany('');
      setNewSessionJobTitle('');
      setNewSessionJobDescription('');
      setNewSessionName('');
      return;
    }
    
    try {
      // Fetch the full resume details
      const response = await apiRequest(`/api/tailored-resumes/${resumeId}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const resume = await response.json();
        
        // Auto-fill fields
        setNewSessionCompany(resume.company || '');
        setNewSessionJobTitle(resume.jobTitle || '');
        setNewSessionJobDescription(resume.originalJobDescription || '');
        
        // Intelligently pre-fill session name
        setNewSessionName(`Prep for ${resume.jobTitle} at ${resume.company}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load resume details",
        variant: "destructive"
      });
    }
  };

  const handleCloseDialog = () => {
    setShowNewSessionDialog(false);
    setSelectedResumeId('none');
    setNewSessionName('');
    setNewSessionCompany('');
    setNewSessionJobTitle('');
    setNewSessionJobDescription('');
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive"
      });
      return;
    }

    createSessionMutation.mutate({
      name: newSessionName,
      mode: focusMode,
      jobId: jobId || undefined,
      skill: skill || undefined,
      companyName: newSessionCompany.trim() || undefined,
      jobTitle: newSessionJobTitle.trim() || undefined,
      jobDescription: newSessionJobDescription.trim() || undefined,
    });

    handleCloseDialog();
  };

  const handleLoadSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    toast({
      title: "Session loaded",
      description: "Your saved interview prep data has been restored",
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setShowNewSessionDialog(true);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Interview Session</DialogTitle>
            <DialogDescription>
              Save your interview prep progress. Add job details for personalized questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resume-selector">Start with a Saved Resume</Label>
              <Select value={selectedResumeId} onValueChange={handleResumeSelection}>
                <SelectTrigger id="resume-selector">
                  <SelectValue placeholder="Select a resume from your library..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Enter manually</SelectItem>
                  {savedResumes
                    .filter((resume: any) => resume.id && resume.id.trim() !== '')
                    .map((resume: any) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.company} - {resume.jobTitle}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Optional: Select a saved resume to auto-fill job details below
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name *</Label>
              <Input
                id="session-name"
                placeholder="e.g., Microsoft DBA Prep, General SQL Practice"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateSession();
                  }
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                placeholder="e.g., Microsoft, Amazon, Google"
                value={newSessionCompany}
                onChange={(e) => setNewSessionCompany(e.target.value)}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Optional: Add company name for company-specific questions
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title</Label>
              <Input
                id="job-title"
                placeholder="e.g., Senior SQL Server DBA, Database Administrator"
                value={newSessionJobTitle}
                onChange={(e) => setNewSessionJobTitle(e.target.value)}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Optional: Specify the role you're preparing for
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the full job description here for highly targeted questions..."
                value={newSessionJobDescription}
                onChange={(e) => setNewSessionJobDescription(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Optional: Paste the job description to generate questions specific to the role's requirements
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession} disabled={!newSessionName.trim()}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                    Interview Prep Hub
                  </h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Practice questions, skill explanations, and STAR stories
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-neutral-600 dark:text-neutral-300 mr-2">
                  {user.username}
                </span>
              )}
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Context Panel */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Preparation Context</span>
                  {jobContext && (
                    <Badge variant="secondary">
                      {jobContext.company} - {jobContext.jobTitle}
                    </Badge>
                  )}
                  {skill && (
                    <Badge variant="secondary">{skill}</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  {focusMode === 'job' && jobContext
                    ? `Preparing for ${jobContext.jobTitle} at ${jobContext.company}`
                    : focusMode === 'skill' && skill
                    ? `Focused on ${skill} skills`
                    : skillsInsights?.topRequestedSkills && skillsInsights.topRequestedSkills.length > 0
                    ? `Based on your top ${Math.min(skillsInsights.topRequestedSkills.length, 10)} in-demand skills from ${skillsInsights.stats?.totalJobsAnalyzed || 0} job${(skillsInsights.stats?.totalJobsAnalyzed || 0) !== 1 ? 's' : ''}`
                    : 'General SQL Server DBA interview preparation'}
                </CardDescription>
                {focusMode === 'general' && skillsInsights?.topRequestedSkills && skillsInsights.topRequestedSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skillsInsights.topRequestedSkills.slice(0, 8).map((s: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {s.skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Select value={focusMode} onValueChange={(v: any) => setFocusMode(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job">Job-Specific</SelectItem>
                  <SelectItem value="skill">Skill-Specific</SelectItem>
                  <SelectItem value="general">General DBA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Session Management Panel */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Interview Session
                </CardTitle>
                <CardDescription>
                  {currentSessionId 
                    ? `Active: ${sessions.find(s => s.id === currentSessionId)?.name || 'Unnamed Session'}`
                    : 'Save your progress by creating or loading a session'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={currentSessionId || ''} onValueChange={handleLoadSession}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Load a session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.length === 0 ? (
                      <div className="p-2 text-sm text-neutral-500">No saved sessions</div>
                    ) : (
                      sessions.map((session: any) => (
                        <SelectItem key={session.id} value={session.id}>
                          <div className="flex items-center gap-2">
                            <span>{session.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {session.mode}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowNewSessionDialog(true)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Session
                </Button>
                {currentSessionId && (
                  <Button 
                    onClick={() => handleDeleteSession(currentSessionId)} 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
            {currentSessionId && updateSessionMutation.isPending && (
              <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Questions & Answers
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Explain These Skills
            </TabsTrigger>
            <TabsTrigger value="stories" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              STAR Story Builder
            </TabsTrigger>
          </TabsList>

          {/* Questions & Answers Tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Interview Questions & Answers</CardTitle>
                    <CardDescription>
                      Practice technical and behavioral questions with suggested answers
                    </CardDescription>
                  </div>
                  <Button onClick={fetchQuestions} disabled={loadingQuestions}>
                    {loadingQuestions ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate Questions</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingQuestions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Click "Generate Questions" to create interview questions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q) => {
                      const isOpen = openQuestions.has(q.id);
                      const status = practiceStatus.get(q.id);
                      
                      return (
                        <Card key={q.id} className="border-2">
                          <Collapsible open={isOpen} onOpenChange={() => toggleQuestion(q.id)}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-4">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" className="flex-1 justify-start p-0 h-auto hover:bg-transparent text-left">
                                    <div className="flex items-start gap-3 w-full">
                                      <div className="mt-1">
                                        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-sm leading-relaxed">{q.question}</p>
                                        <div className="flex gap-2 mt-2">
                                          <Badge variant={q.type === 'technical' ? 'default' : 'secondary'}>
                                            {q.type}
                                          </Badge>
                                          <Badge variant="outline">{q.topic}</Badge>
                                          <Badge variant={
                                            q.difficulty === 'senior' ? 'destructive' :
                                            q.difficulty === 'mid' ? 'default' : 'secondary'
                                          }>
                                            {q.difficulty}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </Button>
                                </CollapsibleTrigger>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={status === 'needs-practice' ? 'destructive' : status === 'confident' ? 'default' : 'outline'}
                                    onClick={() => togglePracticeStatus(q.id)}
                                  >
                                    {status === 'needs-practice' ? (
                                      <>
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Practice
                                      </>
                                    ) : status === 'confident' ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Confident
                                      </>
                                    ) : (
                                      'Mark'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CollapsibleContent>
                              <CardContent className="pt-0 space-y-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-1">
                                      <Brain className="h-4 w-4" />
                                      Suggested Answer
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyToClipboard(q.suggestedAnswer, 'Answer')}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-line">
                                    {q.suggestedAnswer}
                                  </p>
                                </div>
                                
                                {q.star && (
                                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1 mb-3">
                                      <Star className="h-4 w-4" />
                                      STAR Framework Example
                                    </p>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="font-semibold text-amber-900 dark:text-amber-100">Situation:</span>
                                        <p className="text-amber-800 dark:text-amber-200">{q.star.situation}</p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-amber-900 dark:text-amber-100">Task:</span>
                                        <p className="text-amber-800 dark:text-amber-200">{q.star.task}</p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-amber-900 dark:text-amber-100">Action:</span>
                                        <p className="text-amber-800 dark:text-amber-200">{q.star.action}</p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-amber-900 dark:text-amber-100">Result:</span>
                                        <p className="text-amber-800 dark:text-amber-200">{q.star.result}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Explain These Skills Tab */}
          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Skill Explanations</CardTitle>
                    <CardDescription>
                      Multi-level explanations for key DBA skills
                    </CardDescription>
                  </div>
                  <Button onClick={fetchSkills} disabled={loadingSkills}>
                    {loadingSkills ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate Explanations</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSkills ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : skills.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Click "Generate Explanations" to create skill explanations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {skills.map((skill, idx) => (
                      <Card key={idx} className="border-2">
                        <CardHeader>
                          <CardTitle className="text-lg">{skill.skill}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {skill.levels.map((level) => (
                            <div key={level.label} className="border rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={
                                  level.label === '30s' ? 'secondary' :
                                  level.label === '2min' ? 'default' : 'destructive'
                                }>
                                  {level.label === '30s' ? '30-Second' :
                                   level.label === '2min' ? '2-Minute' : 'Deep Dive'}
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                {level.text}
                              </p>
                            </div>
                          ))}
                          
                          {skill.pitfalls && skill.pitfalls.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                              <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-2">
                                Common Pitfalls
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                {skill.pitfalls.map((pitfall, i) => (
                                  <li key={i} className="text-sm text-red-800 dark:text-red-200">
                                    {pitfall}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {skill.examplesFromResume && skill.examplesFromResume.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                              <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-2">
                                From Your Resume
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                {skill.examplesFromResume.map((example, i) => (
                                  <li key={i} className="text-sm text-green-800 dark:text-green-200">
                                    {example}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STAR Story Builder Tab */}
          <TabsContent value="stories">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>STAR Story Builder</CardTitle>
                    <CardDescription>
                      Structured narratives from your resume achievements
                    </CardDescription>
                  </div>
                  <Button onClick={fetchStories} disabled={loadingStories}>
                    {loadingStories ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate Stories</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStories ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : stories.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Click "Generate Stories" to create STAR stories from your resume
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stories.map((story) => (
                      <Card key={story.id} className="border-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{story.title}</CardTitle>
                              <Badge variant="outline" className="mt-2">{story.skill}</Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(story.extendedVersion, 'Story')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20">
                              <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                Situation
                              </p>
                              <p className="text-sm text-purple-800 dark:text-purple-200">
                                {story.situation}
                              </p>
                            </div>
                            <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
                              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                Task
                              </p>
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                {story.task}
                              </p>
                            </div>
                            <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-900/20">
                              <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                                Action
                              </p>
                              <p className="text-sm text-green-800 dark:text-green-200">
                                {story.action}
                              </p>
                            </div>
                            <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20">
                              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                Result
                              </p>
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                {story.result}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="bg-neutral-50 dark:bg-neutral-800 border rounded-lg p-3">
                              <p className="text-xs font-semibold mb-1">Concise Version (30-60s)</p>
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                {story.conciseVersion}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Weekly Prep Plan */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Interview Prep Plan
            </CardTitle>
            <CardDescription>
              Based on your practice status and focus areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Questions to Practice</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Array.from(practiceStatus.values()).filter(s => s === 'needs-practice').length}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Marked for review</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Skills to Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {skills.length}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Key skills loaded</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">STAR Stories</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stories.length}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Ready to practice</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
