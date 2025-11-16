import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, FileText, Copy, Download, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SectionScore {
  earned: number;
  possible: number;
  evidence: string[];
}

interface ATSBreakdownProps {
  sessionId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ATSBreakdown({ sessionId, open, onOpenChange }: ATSBreakdownProps) {
  const [breakdown, setBreakdown] = useState<any>(null);
  const [plainText, setPlainText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchATSBreakdown = async () => {
    if (breakdown) return; // Already loaded
    
    setLoading(true);
    try {
      const [breakdownResponse, plainTextResponse] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/ats-breakdown`),
        fetch(`/api/sessions/${sessionId}/plain-text-preview`)
      ]);
      
      if (breakdownResponse.ok) {
        const data = await breakdownResponse.json();
        setBreakdown(data);
      }
      
      if (plainTextResponse.ok) {
        const data = await plainTextResponse.json();
        setPlainText(data.plainTextPreview || '');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ATS breakdown",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPlainText = () => {
    navigator.clipboard.writeText(plainText);
    toast({
      title: "Copied!",
      description: "Plain text preview copied to clipboard"
    });
  };

  const downloadPlainText = () => {
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-ats-preview.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Plain text preview downloaded"
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const renderSectionScore = (label: string, section: SectionScore | undefined) => {
    if (!section) return null;
    
    const percentage = section.possible > 0 
      ? Math.round((section.earned / section.possible) * 100) 
      : 0;
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{label}</span>
          <span className={`text-sm font-semibold ${getScoreColor(percentage)}`}>
            {section.earned}/{section.possible} ({percentage}%)
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
        {section.evidence && section.evidence.length > 0 && (
          <div className="mt-2 ml-4">
            {section.evidence.slice(0, 2).map((evidence, idx) => (
              <p key={idx} className="text-xs text-muted-foreground">• {evidence}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={fetchATSBreakdown}>
          <BarChart3 className="h-4 w-4 mr-2" />
          ATS Analysis
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ATS Score Breakdown & Preview
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-3 text-muted-foreground">Loading ATS analysis...</span>
          </div>
        ) : !breakdown ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No ATS breakdown available yet.</p>
          </div>
        ) : (
          <Tabs defaultValue="breakdown" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="breakdown">Score Breakdown</TabsTrigger>
              <TabsTrigger value="issues">Formatting Issues</TabsTrigger>
              <TabsTrigger value="preview">Plain Text Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="breakdown" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall ATS Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - (breakdown.overallScore || 0) / 100)}`}
                          className={getScoreColor(breakdown.overallScore || 0)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-3xl font-bold ${getScoreColor(breakdown.overallScore || 0)}`}>
                          {breakdown.overallScore || 0}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold mb-1">
                        {getScoreLabel(breakdown.overallScore || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your resume is {breakdown.overallScore >= 75 ? 'well-optimized' : 'could be improved'} for ATS systems
                      </p>
                    </div>
                  </div>
                  <Progress value={breakdown.overallScore || 0} className="h-3" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Section Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  {breakdown.sectionScores && (
                    <div className="space-y-4">
                      {renderSectionScore('Core Technologies', breakdown.sectionScores.coreTech)}
                      {renderSectionScore('Responsibilities', breakdown.sectionScores.responsibilities)}
                      {renderSectionScore('Tools & Automation', breakdown.sectionScores.tools)}
                      {renderSectionScore('Adjacent Datastores', breakdown.sectionScores.adjacentDataStores)}
                      {renderSectionScore('Compliance & Security', breakdown.sectionScores.compliance)}
                      {renderSectionScore('Logistics', breakdown.sectionScores.logistics)}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {breakdown.coverageReport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Keyword Coverage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Matched Keywords ({breakdown.coverageReport.matchedKeywords?.length || 0})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(breakdown.coverageReport.matchedKeywords || []).slice(0, 15).map((keyword: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Missing Keywords ({breakdown.coverageReport.missingKeywords?.length || 0})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(breakdown.coverageReport.missingKeywords || []).slice(0, 15).map((keyword: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ATS Formatting Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  {breakdown.formattingIssues && breakdown.formattingIssues.length > 0 ? (
                    <div className="space-y-3">
                      {breakdown.formattingIssues.map((issue: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-900">{issue}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="text-sm text-green-900">No major formatting issues detected!</p>
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">ATS Formatting Tips:</p>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Use standard section headings (Experience, Education, Skills)</li>
                      <li>Avoid tables, text boxes, and multi-column layouts</li>
                      <li>Use simple bullet points (-, •)</li>
                      <li>Place contact information at the top</li>
                      <li>Avoid headers, footers, and images</li>
                      <li>Use standard fonts (Arial, Calibri, Times New Roman)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Plain Text ATS Preview
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={copyPlainText}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={downloadPlainText}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      This is how ATS systems typically parse your resume. Review for any parsing issues.
                    </p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-gray-800 max-h-96 overflow-y-auto">
                      {plainText || 'Loading preview...'}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
