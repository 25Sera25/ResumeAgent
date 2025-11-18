import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Star, 
  Trash2, 
  Edit, 
  ArrowLeft, 
  Plus,
  Upload,
  Search,
  Calendar,
  User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/FileUpload";
import { apiRequest } from "@/lib/queryClient";

interface BaseResume {
  id: string;
  name: string;
  originalFilename: string;
  content: string;
  contactInfo?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BaseResumeLibrary() {
  const [resumes, setResumes] = useState<BaseResume[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<BaseResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingResume, setEditingResume] = useState<BaseResume | null>(null);
  const [newResumeName, setNewResumeName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    filterResumes();
  }, [resumes, searchTerm]);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/resumes', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch base resumes",
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
        resume.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resume.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (resume.contactInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredResumes(filtered);
  };

  const handleUploadResume = async () => {
    if (!uploadFile || !newResumeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and select a file",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('resume', uploadFile);
      formData.append('name', newResumeName);
      formData.append('setAsDefault', 'false');

      const response = await fetch('/api/resumes', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Base resume uploaded successfully",
        });
        setUploadDialogOpen(false);
        setNewResumeName("");
        setUploadFile(null);
        fetchResumes();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleRenameResume = async (resumeId: string, newName: string) => {
    try {
      const response = await apiRequest(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        body: { name: newName },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Base resume renamed successfully",
        });
        setEditingResume(null);
        fetchResumes();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename base resume",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (resumeId: string) => {
    try {
      const response = await apiRequest(`/api/resumes/${resumeId}/set-default`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Default base resume updated",
        });
        fetchResumes();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set default base resume",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResume = async (resumeId: string, resumeName: string) => {
    if (!confirm(`Are you sure you want to delete "${resumeName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Base resume deleted successfully",
        });
        fetchResumes();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete base resume",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg shadow-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  Base Resume Library
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Manage your saved base resumes for quick tailoring
                </p>
              </div>
            </div>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Base Resume
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New Base Resume</DialogTitle>
                  <DialogDescription>
                    Upload a resume file to save it for future tailoring sessions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="resume-name">Resume Name</Label>
                    <Input
                      id="resume-name"
                      placeholder="e.g., Senior DBA Resume"
                      value={newResumeName}
                      onChange={(e) => setNewResumeName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Resume File</Label>
                    <FileUpload
                      onFileSelect={setUploadFile}
                      currentFile={uploadFile ? {
                        name: uploadFile.name,
                        size: uploadFile.size,
                        type: uploadFile.type
                      } : null}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUploadResume}>
                    Upload
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        {/* Search and Filter */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              placeholder="Search base resumes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Base Resumes</p>
                  <p className="text-2xl font-bold">{resumes.length}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Default Resume</p>
                  <p className="text-lg font-bold">
                    {resumes.find(r => r.isDefault)?.name || 'None set'}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Search Results</p>
                  <p className="text-2xl font-bold">{filteredResumes.length}</p>
                </div>
                <Search className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resume List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 dark:text-neutral-400">Loading base resumes...</p>
          </div>
        ) : filteredResumes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No matching resumes found' : 'No base resumes yet'}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Upload your first base resume to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Base Resume
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResumes.map((resume) => (
              <Card key={resume.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingResume?.id === resume.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingResume.name}
                            onChange={(e) => setEditingResume({ ...editingResume, name: e.target.value })}
                            className="text-lg font-bold"
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleRenameResume(resume.id, editingResume.name)}
                            >
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingResume(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {resume.name}
                            {resume.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {resume.originalFilename}
                          </CardDescription>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {resume.contactInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-neutral-500" />
                        <div>
                          <p className="font-medium">{resume.contactInfo.name}</p>
                          {resume.contactInfo.title && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              {resume.contactInfo.title}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <Calendar className="w-4 h-4" />
                      <span>Added {formatDate(resume.createdAt)}</span>
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      {!resume.isDefault && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefault(resume.id)}
                          className="flex-1"
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingResume(resume)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteResume(resume.id, resume.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
