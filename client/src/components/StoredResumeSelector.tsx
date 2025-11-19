import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Star, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface StoredResume {
  id: string;
  name: string;
  originalFilename: string;
  content: string;
  contactInfo: any;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredResumeSelectorProps {
  sessionId: string;
  onResumeSelected?: () => void;
}

export default function StoredResumeSelector({ sessionId, onResumeSelected }: StoredResumeSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSelector, setShowSelector] = useState(false);

  // Fetch stored resumes
  const { data: resumes = [], isLoading } = useQuery<StoredResume[]>({
    queryKey: ['/api/resumes'],
  });

  // Use stored resume mutation
  const useResumeMutation = useMutation({
    mutationFn: async (resumeId: string) => {
      const response = await apiRequest(`/api/sessions/${sessionId}/use-resume/${resumeId}`, {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
      setShowSelector(false);
      onResumeSelected?.();
      toast({
        title: "Success",
        description: "Resume loaded from library",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to load resume: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleUseResume = (resumeId: string) => {
    useResumeMutation.mutate(resumeId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (resumes.length === 0) {
    return null; // Don't show selector if no stored resumes
  }

  return (
    <Dialog open={showSelector} onOpenChange={setShowSelector}>
      <DialogTrigger asChild>
        <div>
          <Button variant="outline" data-testid="button-use-stored-resume">
            <FileText className="w-4 h-4 mr-2" />
            Use Stored Resume
          </Button>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Reuse a resume you've previously uploaded.
          </p>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select from Resume Library</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="text-center py-8">Loading your resumes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumes.map((resume: StoredResume) => (
              <Card key={resume.id} className="relative cursor-pointer hover:shadow-md transition-shadow">
                {resume.isDefault && (
                  <Badge className="absolute top-2 right-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <Star className="w-3 h-3 mr-1" />
                    Default
                  </Badge>
                )}
                
                <CardHeader>
                  <CardTitle className="text-lg" data-testid={`text-stored-resume-name-${resume.id}`}>
                    {resume.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {resume.originalFilename}
                  </p>
                  <p className="text-xs text-gray-500">
                    Added {formatDate(resume.createdAt)}
                  </p>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    {resume.contactInfo && (
                      <div className="text-sm">
                        <p className="font-medium">{resume.contactInfo.name}</p>
                        <p className="text-gray-600 dark:text-gray-300">{resume.contactInfo.title}</p>
                      </div>
                    )}
                    
                    <Button
                      className="w-full mt-4"
                      onClick={() => handleUseResume(resume.id)}
                      disabled={useResumeMutation.isPending}
                      data-testid={`button-select-resume-${resume.id}`}
                    >
                      {useResumeMutation.isPending ? 'Loading...' : 'Use This Resume'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="flex justify-center pt-4 border-t">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Don't see your resume? <a href="/resume-library" className="text-blue-600 hover:underline">Manage your library</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}