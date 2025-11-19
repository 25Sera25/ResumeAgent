import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Star, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

interface BaseResumeSelectorProps {
  onResumeSelected: (resumeId: string | null) => void;
  onModeChange?: (mode: 'existing' | 'upload') => void;
  defaultMode?: 'existing' | 'upload';
  manualUploadOnly?: boolean;
}

export default function BaseResumeSelector({ 
  onResumeSelected, 
  onModeChange,
  defaultMode = 'existing',
  manualUploadOnly = false
}: BaseResumeSelectorProps) {
  // When manual upload only is enabled, always use upload mode
  const initialMode = manualUploadOnly ? 'upload' : defaultMode;
  const [mode, setMode] = useState<'existing' | 'upload'>(initialMode);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  // Fetch stored resumes (base resumes) - only if not manual upload only
  const { data: resumes = [], isLoading } = useQuery<StoredResume[]>({
    queryKey: ['/api/resumes'],
    enabled: !manualUploadOnly, // Don't fetch if manual upload only
  });

  // Find default resume
  const defaultResume = resumes.find(r => r.isDefault);

  // Initialize with default resume if available and mode is 'existing'
  // Skip if manual upload only is enabled
  if (!manualUploadOnly && mode === 'existing' && defaultResume && !selectedResumeId && resumes.length > 0) {
    setSelectedResumeId(defaultResume.id);
    onResumeSelected(defaultResume.id);
  }

  const handleModeChange = (newMode: 'existing' | 'upload') => {
    setMode(newMode);
    onModeChange?.(newMode);
    
    if (newMode === 'upload') {
      setSelectedResumeId(null);
      onResumeSelected(null);
    } else if (newMode === 'existing' && defaultResume) {
      setSelectedResumeId(defaultResume.id);
      onResumeSelected(defaultResume.id);
    }
  };

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    onResumeSelected(resumeId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection - Hidden when manual upload only */}
      {!manualUploadOnly && (
        <RadioGroup value={mode} onValueChange={handleModeChange} className="space-y-3">
        <div className={cn(
          "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
          mode === 'existing' 
            ? "border-primary bg-primary/5" 
            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
        )}>
          <RadioGroupItem value="existing" id="mode-existing" />
          <Label 
            htmlFor="mode-existing" 
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <div>
                <p className="font-semibold">Use Saved Base Resume</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Select from your resume library ({resumes.length} available)
                </p>
              </div>
            </div>
          </Label>
        </div>

        <div className={cn(
          "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
          mode === 'upload' 
            ? "border-primary bg-primary/5" 
            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
        )}>
          <RadioGroupItem value="upload" id="mode-upload" />
          <Label 
            htmlFor="mode-upload" 
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              <div>
                <p className="font-semibold">Upload New Resume</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {manualUploadOnly 
                    ? "Upload a resume for this session" 
                    : "Will be saved to your library automatically"}
                </p>
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
      )}

      {/* Resume Selection (shown when mode is 'existing') */}
      {mode === 'existing' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
              Loading your base resumes...
            </div>
          ) : resumes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <Plus className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                <h4 className="font-semibold mb-2">No Base Resumes Yet</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Upload a resume to create your first base resume
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => handleModeChange('upload')}
                >
                  Upload Resume
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Select Base Resume</Label>
              <Select 
                value={selectedResumeId || undefined} 
                onValueChange={handleResumeSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a base resume..." />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      <div className="flex items-center gap-2">
                        <span>{resume.name}</span>
                        {resume.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Show selected resume details */}
              {selectedResumeId && resumes.find(r => r.id === selectedResumeId) && (
                <Card className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
                  <CardContent className="pt-4">
                    {(() => {
                      const resume = resumes.find(r => r.id === selectedResumeId)!;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{resume.originalFilename}</p>
                            {resume.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {resume.contactInfo && (
                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                              <p className="font-medium">{resume.contactInfo.name}</p>
                              {resume.contactInfo.title && (
                                <p>{resume.contactInfo.title}</p>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-neutral-500">
                            Added {formatDate(resume.createdAt)}
                          </p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
