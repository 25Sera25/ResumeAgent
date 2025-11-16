import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, CheckCircle, Trash2, Filter, Search, Sparkles, FileText, ArrowLeft, Home, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TailoredResume {
  id: string;
  sessionId: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  originalJobDescription?: string;
  atsScore?: number;
  filename: string;
  appliedToJob: boolean;
  applicationDate?: string;
  notes?: string;
  tags?: string[];
  microEdits?: string[];
  aiImprovements?: string[];
  createdAt: string;
}

export default function ResumeLibrary() {
  const [resumes, setResumes] = useState<TailoredResume[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<TailoredResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    filterResumes();
  }, [resumes, searchTerm, filterStatus]);

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/tailored-resumes');
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch saved resumes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterResumes = () => {
    let filtered = resumes;

    if (searchTerm) {
      filtered = filtered.filter(resume => 
        resume.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resume.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resume.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(resume => 
        filterStatus === "applied" ? resume.appliedToJob : !resume.appliedToJob
      );
    }

    setFilteredResumes(filtered);
  };

  const handleMarkAsApplied = async (resumeId: string, notes: string, priority: string, source: string) => {
    try {
      const response = await fetch(`/api/tailored-resumes/${resumeId}/mark-applied`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, priority, source }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success! ✓",
          description: result.message,
          variant: "default",
        });
        fetchResumes(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark as applied",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (resumeId: string, filename: string, format: 'pdf' | 'docx') => {
    try {
      const response = await fetch(`/api/tailored-resumes/${resumeId}/download/${format}`);
      if (response.ok) {
        // Extract filename from Content-Disposition header (server handles the full filename)
        const contentDisposition = response.headers.get('Content-Disposition');
        let downloadFilename = `${filename}.${format}`; // fallback
        
        if (contentDisposition) {
          // Parse Content-Disposition header: attachment; filename*=UTF-8''encoded_filename
          const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)|filename="?(.+?)"?$/);
          if (filenameMatch) {
            downloadFilename = decodeURIComponent(filenameMatch[1] || filenameMatch[2]);
          }
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download Started",
          description: `${downloadFilename} is downloading`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    
    try {
      const response = await fetch(`/api/tailored-resumes/${resumeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Deleted",
          description: "Resume deleted successfully",
          variant: "default",
        });
        fetchResumes();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="text-center">Loading your resume library...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/job-tracker">
            <Button variant="ghost" size="sm" data-testid="link-job-tracker">
              Job Tracker
            </Button>
          </Link>
          <Link href="/follow-ups">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="link-follow-ups">
              <Mail className="h-4 w-4" />
              Follow-Ups
            </Button>
          </Link>
          <Link href="/resume-analytics">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="link-resume-analytics">
              <Sparkles className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Resume Library</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Manage your permanently saved tailored resumes</p>
          </div>
        <div className="flex items-center space-x-2 text-sm text-neutral-600">
          <Badge variant="outline">{resumes.length} Total</Badge>
          <Badge variant="secondary">{resumes.filter(r => r.appliedToJob).length} Applied</Badge>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <Input
            placeholder="Search by company, job title, or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-resumes"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-filter-status">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resumes</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="not-applied">Not Applied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resume Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResumes.map((resume) => (
          <Card key={resume.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg leading-tight">{resume.company}</CardTitle>
                  <p className="text-sm text-neutral-600">{resume.jobTitle}</p>
                </div>
                {resume.appliedToJob && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">ATS Score:</span>
                <Badge variant={resume.atsScore && resume.atsScore >= 90 ? "default" : "secondary"}>
                  {resume.atsScore || 85}%
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Created:</span>
                <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
              </div>

              {resume.appliedToJob && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-xs text-green-800 font-medium">Applied</div>
                  {resume.applicationDate && (
                    <div className="text-xs text-green-600">
                      {new Date(resume.applicationDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {resume.tags && resume.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {resume.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(resume.id, resume.filename, 'docx')}
                    className="flex-1"
                    data-testid={`button-download-docx-${resume.id}`}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(resume.id, resume.filename, 'pdf')}
                    className="flex-1"
                    data-testid={`button-download-pdf-${resume.id}`}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>

                {/* Job Description Button - NEW FEATURE */}
                {resume.originalJobDescription && (
                  <JobDescriptionDialog 
                    jobDescription={resume.originalJobDescription}
                    resumeName={`${resume.company} - ${resume.jobTitle}`}
                  />
                )}

                {/* AI Improvements Button - NEW FEATURE */}
                {((resume.microEdits?.length ?? 0) > 0 || (resume.aiImprovements?.length ?? 0) > 0) && (
                  <AIImprovementsDialog 
                    microEdits={resume.microEdits || []} 
                    aiImprovements={resume.aiImprovements || []}
                    resumeName={`${resume.company} - ${resume.jobTitle}`}
                  />
                )}

                {!resume.appliedToJob && (
                  <MarkAsAppliedDialog
                    onMarkAsApplied={(notes, priority, source) => 
                      handleMarkAsApplied(resume.id, notes, priority, source)
                    }
                  />
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(resume.id)}
                  className="text-red-600 hover:text-red-700"
                  data-testid={`button-delete-${resume.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResumes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-neutral-500">
            {searchTerm || filterStatus !== "all" 
              ? "No resumes match your search criteria" 
              : "No saved resumes yet. Create and save a tailored resume to get started!"}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

interface JobDescriptionDialogProps {
  jobDescription: string;
  resumeName: string;
}

function JobDescriptionDialog({ jobDescription, resumeName }: JobDescriptionDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <FileText className="w-4 h-4 mr-1" />
          View Job Description
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Original Job Description - {resumeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-2 font-medium">
              💡 Perfect for interview preparation! This is the original job posting that was saved when you tailored your resume.
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {jobDescription}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Saved automatically when you tailored your resume for future interview preparation
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AIImprovementsDialogProps {
  microEdits: string[];
  aiImprovements: string[];
  resumeName: string;
}

function AIImprovementsDialog({ microEdits, aiImprovements, resumeName }: AIImprovementsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Sparkles className="w-4 h-4 mr-1" />
          View AI Improvements
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Improvements Made - {resumeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {microEdits.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Micro-Edits Applied Automatically
              </h3>
              <div className="space-y-2">
                {microEdits.map((edit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700">{edit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiImprovements.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                AI Improvements Made
              </h3>
              <div className="space-y-2">
                {aiImprovements.map((improvement, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-blue-700">{improvement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {microEdits.length === 0 && aiImprovements.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              No AI improvements data saved for this resume.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MarkAsAppliedDialogProps {
  onMarkAsApplied: (notes: string, priority: string, source: string) => void;
}

function MarkAsAppliedDialog({ onMarkAsApplied }: MarkAsAppliedDialogProps) {
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [source, setSource] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    onMarkAsApplied(notes, priority, source);
    setOpen(false);
    setNotes("");
    setPriority("medium");
    setSource("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full" data-testid="button-mark-applied">
          <CheckCircle className="w-4 h-4 mr-1" />
          Mark as Applied
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Applied</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add notes about your application..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="textarea-application-notes"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="select-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Source (Optional)</label>
            <Input
              placeholder="LinkedIn, Indeed, Company Website..."
              value={source}
              onChange={(e) => setSource(e.target.value)}
              data-testid="input-application-source"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" data-testid="button-confirm-applied">
              Mark as Applied
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-applied">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}