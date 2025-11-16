import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, CheckCircle, Clock, Link, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import KeywordMatchVisualization from "./KeywordMatchVisualization";

interface JobAnalysisResult {
  title?: string;
  company?: string;
  requirements?: string[];
  keywords?: string[];
  matchScore?: number;
  // Enhanced for JD-first methodology
  charCount?: number;
  wordCount?: string;
  roleArchetype?: string;
  keywordBuckets?: {
    coreTech?: string[];
    responsibilities?: string[];
    tools?: string[];
    adjacentDataStores?: string[];
    compliance?: string[];
    logistics?: string[];
  };
  qualityGates?: {
    sufficientLength?: boolean;
    roleSpecific?: boolean;
    notGeneric?: boolean;
  };
  // Keyword match details
  matchedKeywords?: string[];
  missingKeywords?: string[];
}

interface JobAnalysisProps {
  onAnalyze: (data: { jobUrl?: string; jobDescription?: string }) => Promise<void>;
  result?: JobAnalysisResult | null;
  isAnalyzing?: boolean;
  className?: string;
}

export default function JobAnalysis({ 
  onAnalyze, 
  result, 
  isAnalyzing = false, 
  className 
}: JobAnalysisProps) {
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isUrlValid, setIsUrlValid] = useState(false);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      setIsUrlValid(url.startsWith('http'));
    } catch {
      setIsUrlValid(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setJobUrl(url);
    validateUrl(url);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
  };

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    
    if (inputMode === "url" && isUrlValid) {
      await onAnalyze({ jobUrl });
    } else if (inputMode === "text" && jobDescription.trim()) {
      await onAnalyze({ jobDescription });
    }
  };

  const isReadyToAnalyze = () => {
    return inputMode === "url" ? isUrlValid : jobDescription.trim().length > 0;
  };

  const getStatusBadge = () => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center space-x-2 px-4 py-1.5 bg-status-warning text-white text-sm font-semibold rounded-full shadow-sm animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing</span>
        </div>
      );
    }
    
    if (result) {
      return (
        <div className="flex items-center space-x-2 px-4 py-1.5 bg-status-success text-white text-sm font-semibold rounded-full shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Complete</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 px-4 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-semibold rounded-full">
        <Clock className="w-4 h-4" />
        <span>Waiting</span>
      </div>
    );
  };

  return (
    <Card className={cn("border border-neutral-200 dark:border-neutral-700 overflow-hidden card-hover shadow-md rounded-xl animate-slide-in", className)}>
      <CardHeader className="px-8 py-5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-primary text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
              2
            </div>
            <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Job Posting Analysis</h3>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-6">
        {/* Input Mode Selection */}
        <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as "url" | "text")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800">
            <TabsTrigger value="url" className="flex items-center space-x-2 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700" data-testid="tab-url">
              <Link className="w-4 h-4" />
              <span>Job URL</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center space-x-2 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700" data-testid="tab-text">
              <FileText className="w-4 h-4" />
              <span>Job Description</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                Job Posting URL
              </label>
              <div className="flex space-x-3">
                <Input
                  type="url"
                  placeholder="https://company.com/careers/sql-dba-position"
                  value={jobUrl}
                  onChange={handleUrlChange}
                  className="flex-1 h-11 text-base"
                  disabled={isAnalyzing}
                  data-testid="input-job-url"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={!isReadyToAnalyze() || isAnalyzing}
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 button-hover text-white px-6 h-11 shadow-md"
                  data-testid="button-analyze-job"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Paste the URL of the job posting you want to tailor your resume for
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="text" className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                Job Description
              </label>
              <div className="space-y-3">
                <Textarea
                  placeholder="Paste the full job description here including requirements, skills, and responsibilities..."
                  value={jobDescription}
                  onChange={handleDescriptionChange}
                  rows={6}
                  className="resize-none text-base"
                  disabled={isAnalyzing}
                  data-testid="textarea-job-description"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {jobDescription.length} characters
                  </p>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!isReadyToAnalyze() || isAnalyzing}
                    size="lg"
                    className="bg-gradient-primary hover:opacity-90 button-hover text-white px-6 h-11 shadow-md"
                    data-testid="button-analyze-job-text"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        Analyze Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Analysis Results */}
        {(result || isAnalyzing) && (
          <Card className="border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-neutral-800 dark:text-neutral-100 text-lg">Analysis Results</h4>
                {isAnalyzing && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">Processing...</span>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {result && (
                <>
                  {/* Quality Gates & Archetype */}
                  {result.qualityGates && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-3">
                        JD Quality Assessment
                      </h5>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          {result.qualityGates.sufficientLength ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Length: {result.charCount || 0} chars
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.qualityGates.roleSpecific ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Role-Specific</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.qualityGates.notGeneric ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Not Generic</span>
                        </div>
                      </div>
                      {result.roleArchetype && (
                        <div className="mt-3">
                          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                            {result.roleArchetype}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Job Title & Company */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Job Title
                      </label>
                      <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mt-2" data-testid="text-job-title">
                        {result.title || "Not detected"}
                      </p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Company
                      </label>
                      <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mt-2" data-testid="text-company">
                        {result.company || "Not detected"}
                      </p>
                    </div>
                  </div>

                  {/* Keyword Buckets */}
                  {result.keywordBuckets && (
                    <div>
                      <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-3 block">
                        Keyword Analysis Buckets
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(result.keywordBuckets).map(([bucket, keywords]) => {
                          if (!keywords || keywords.length === 0) return null;
                          return (
                            <div key={bucket} className="space-y-2">
                              <h6 className="text-xs font-medium capitalize text-neutral-700">
                                {bucket.replace(/([A-Z])/g, ' $1').trim()}
                              </h6>
                              <div className="flex flex-wrap gap-1">
                                {keywords.slice(0, 5).map((keyword, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="secondary" 
                                    className="text-xs px-2 py-1"
                                  >
                                    {keyword}
                                  </Badge>
                                ))}
                                {keywords.length > 5 && (
                                  <Badge variant="outline" className="text-xs px-2 py-1">
                                    +{keywords.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Key Requirements */}
                  {result.keywords && result.keywords.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-2 block">
                        Key Requirements Detected
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {result.keywords.map((keyword, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="bg-blue-100 text-blue-800"
                            data-testid={`badge-keyword-${index}`}
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keyword Match Visualization */}
                  {(result.matchedKeywords || result.missingKeywords) && (
                    <KeywordMatchVisualization
                      matchedKeywords={result.matchedKeywords || []}
                      missingKeywords={result.missingKeywords || []}
                      matchScore={result.matchScore}
                    />
                  )}

                  {/* Match Score - Only show if keyword visualization is not shown */}
                  {result.matchScore !== undefined && !result.matchedKeywords && !result.missingKeywords && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                          Resume Match Score
                        </label>
                        <span className="text-sm font-bold text-secondary" data-testid="text-match-score">
                          {result.matchScore}%
                        </span>
                      </div>
                      <Progress value={result.matchScore} className="w-full h-2" />
                      <p className="text-xs text-neutral-600 mt-1">
                        {result.matchScore >= 80 ? "Excellent match" : 
                         result.matchScore >= 60 ? "Good match with room for improvement" :
                         "Needs significant improvement"}
                      </p>
                    </div>
                  )}
                </>
              )}

              {isAnalyzing && !result && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-sm text-neutral-600">Analyzing job posting...</p>
                  <p className="text-xs text-neutral-500 mt-1">This may take a few moments</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
