import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Expand, Download, FileText, Target, Save, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import InterviewPrep from "./InterviewPrep";
import ATSBreakdown from "./ATSBreakdown";
import { useState } from "react";

interface ResumeContent {
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    achievements: string[];
  }>;
  skills?: string[];
  keywords?: string[];
  improvements?: string[];
  atsScore?: number;
  // Enhanced for JD-first methodology
  coreScore?: number;
  scoreBreakdown?: {
    coreTech?: { earned: number; possible: number; evidence: string[] };
    responsibilities?: { earned: number; possible: number; evidence: string[] };
    tools?: { earned: number; possible: number; evidence: string[] };
    adjacentDataStores?: { earned: number; possible: number; evidence: string[] };
    compliance?: { earned: number; possible: number; evidence: string[] };
    logistics?: { earned: number; possible: number; evidence: string[] };
  };
  coverageReport?: {
    matchedKeywords?: string[];
    missingKeywords?: string[];
    truthfulnessLevel?: Record<string, 'hands-on' | 'familiar' | 'omitted'>;
  };
  appliedMicroEdits?: string[];
  suggestedMicroEdits?: string[];
}

interface ResumePreviewProps {
  content?: ResumeContent | null;
  isOriginal?: boolean;
  onDownload?: (format: 'pdf' | 'docx') => void;
  onFullPreview?: () => void;
  onSaveToLibrary?: () => void;
  sessionId?: string;
  className?: string;
}

export default function ResumePreview({
  content,
  isOriginal = false,
  onDownload,
  onFullPreview,
  onSaveToLibrary,
  sessionId,
  className
}: ResumePreviewProps) {
  const { toast } = useToast();
  const hasContent = content && (content.summary || content.experience || content.skills);
  const [interviewPrepOpen, setInterviewPrepOpen] = useState(false);
  const [atsBreakdownOpen, setAtsBreakdownOpen] = useState(false);

  const handleSaveToLibrary = async () => {
    if (!sessionId || !content) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Saved to Library! ✓",
          description: `${result.filename} saved permanently`,
          variant: "default",
        });
        onSaveToLibrary?.();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save resume to library",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-neutral-800">
          {isOriginal ? "Resume Preview" : "Tailored Resume Preview"}
        </h4>
        <div className="flex space-x-2">
          {onFullPreview && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onFullPreview}
              data-testid="button-full-preview"
            >
              <Expand className="w-4 h-4 mr-1" />
              Full Preview
            </Button>
          )}
          {!isOriginal && hasContent && (
            <>
              {/* Interview Prep and ATS Analysis Buttons */}
              {sessionId && (
                <>
                  <InterviewPrep 
                    sessionId={sessionId} 
                    open={interviewPrepOpen}
                    onOpenChange={setInterviewPrepOpen}
                  />
                  <ATSBreakdown 
                    sessionId={sessionId}
                    open={atsBreakdownOpen}
                    onOpenChange={setAtsBreakdownOpen}
                  />
                </>
              )}
              
              {/* Save to Library Button */}
              {sessionId && (
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleSaveToLibrary}
                  data-testid="button-save-to-library"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save to Library
                </Button>
              )}
              
              {/* Download Buttons */}
              {onDownload && (
                <>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => onDownload('docx')}
                    data-testid="button-download-docx"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Word (DOCX)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDownload('pdf')}
                    data-testid="button-download-pdf"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Card className="bg-neutral-50 border border-neutral-200">
        <CardContent className="p-4">
          {hasContent ? (
            <div className="space-y-4 text-sm">
              {/* Summary */}
              {content.summary && (
                <div>
                  <div className="font-semibold text-base mb-2" data-testid="text-summary-title">
                    Professional Summary
                  </div>
                  <p className="text-neutral-700 leading-relaxed" data-testid="text-summary-content">
                    {content.summary}
                  </p>
                </div>
              )}

              {/* Experience */}
              {content.experience && Array.isArray(content.experience) && content.experience.length > 0 && (
                <div>
                  <div className="font-semibold text-base mb-2">Experience</div>
                  {content.experience.slice(0, 2).map((exp, index) => (
                    <div key={index} className="mb-3" data-testid={`experience-item-${index}`}>
                      <div className="font-medium text-neutral-800">
                        {exp.title} • {exp.company}
                      </div>
                      <div className="text-xs text-neutral-600 mb-1">{exp.duration}</div>
                      {exp.achievements && Array.isArray(exp.achievements) && exp.achievements.length > 0 && (
                        <ul className="text-neutral-700 text-xs space-y-1">
                          {exp.achievements.slice(0, 2).map((achievement, achIndex) => (
                            <li key={achIndex} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {content.experience.length > 2 && (
                    <p className="text-xs text-neutral-500 italic">
                      + {content.experience.length - 2} more experience entries...
                    </p>
                  )}
                </div>
              )}

              {/* Skills */}
              {content.skills && Array.isArray(content.skills) && content.skills.length > 0 && (
                <div>
                  <div className="font-semibold text-base mb-2">Key Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {content.skills.slice(0, 8).map((skill, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs"
                        data-testid={`skill-badge-${index}`}
                      >
                        {skill}
                      </Badge>
                    ))}
                    {content.skills.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{content.skills.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* ATS Score (for tailored resume) */}
              {!isOriginal && content.atsScore !== undefined && (
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Target className="w-4 h-4 text-primary mr-2" />
                      <span className="font-semibold text-base">ATS Compatibility Score</span>
                    </div>
                    <span className="text-lg font-bold text-primary" data-testid="text-ats-score">
                      {content.atsScore}%
                    </span>
                  </div>
                  <Progress value={content.atsScore} className="w-full h-3 mb-2" />
                  <p className="text-xs text-neutral-600">
                    {content.atsScore >= 90 ? "🎯 Excellent ATS optimization - ready to submit!" : 
                     content.atsScore >= 85 ? "✅ Strong ATS compatibility - very good match" :
                     content.atsScore >= 70 ? "⚠️ Moderate compatibility - consider improvements" :
                     "❌ Low compatibility - needs significant optimization"}
                  </p>
                </div>
              )}

              {/* Enhanced Scoring Breakdown */}
              {!isOriginal && content.scoreBreakdown && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-blue-800 mb-3">
                    JD-First Scoring Breakdown (100 points total)
                  </h5>
                  <div className="space-y-3">
                    {Object.entries(content.scoreBreakdown).map(([category, data]) => {
                      if (!data || typeof data !== 'object' || !('earned' in data) || !('possible' in data)) return null;
                      const percentage = data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0;
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium capitalize text-neutral-700">
                              {category.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-xs font-medium text-blue-700">
                              {data.earned}/{data.possible} pts
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          {data.evidence && data.evidence.length > 0 && (
                            <p className="text-xs text-neutral-600 italic">
                              Evidence: {data.evidence[0]}{data.evidence.length > 1 && '...'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Coverage Report */}
              {!isOriginal && content.coverageReport && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-green-800 mb-3">
                    Keyword Coverage Analysis
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {content.coverageReport.matchedKeywords && content.coverageReport.matchedKeywords.length > 0 && (
                      <div>
                        <h6 className="font-medium text-green-700 mb-1">
                          Matched Keywords ({content.coverageReport.matchedKeywords.length})
                        </h6>
                        <div className="flex flex-wrap gap-1">
                          {content.coverageReport.matchedKeywords.slice(0, 6).map((keyword, idx) => (
                            <Badge key={idx} className="bg-green-100 text-green-800 text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {content.coverageReport.matchedKeywords.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{content.coverageReport.matchedKeywords.length - 6}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {content.coverageReport.missingKeywords && content.coverageReport.missingKeywords.length > 0 && (
                      <div>
                        <h6 className="font-medium text-amber-700 mb-1">
                          Missing Keywords ({content.coverageReport.missingKeywords.length})
                        </h6>
                        <div className="flex flex-wrap gap-1">
                          {content.coverageReport.missingKeywords.slice(0, 6).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {content.coverageReport.missingKeywords.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{content.coverageReport.missingKeywords.length - 6}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Micro-Edits */}
              {!isOriginal && content.appliedMicroEdits && content.appliedMicroEdits.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-green-800 mb-3">
                    Micro-Edits Applied Automatically
                  </h5>
                  <ul className="text-xs text-green-700 space-y-1">
                    {content.appliedMicroEdits.map((edit, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>{edit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements (for tailored resume) */}
              {!isOriginal && content.improvements && Array.isArray(content.improvements) && content.improvements.length > 0 && (
                <div>
                  <div className="font-semibold text-base mb-2 text-secondary">
                    AI Improvements Made
                  </div>
                  <ul className="text-xs text-neutral-600 space-y-1">
                    {content.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start" data-testid={`improvement-${index}`}>
                        <span className="mr-2 text-secondary">•</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isOriginal && (
                <div className="text-center text-neutral-400 text-xs mt-4">
                  <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Resume content continues...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-sm text-neutral-500">
                {isOriginal ? "Upload a resume to see preview" : "Complete tailoring to see preview"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
