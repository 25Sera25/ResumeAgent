import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, CheckCircle2, Send, Calendar, ArrowLeft, Target } from "lucide-react";

export default function ResumeAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/tailored-resumes/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load resume analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100">
      
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/resume-library">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Library
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Resume Performance Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Track success rates and optimize your resume strategy
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Total Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {analytics?.totalVersions || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tailored resumes created
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Applied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {analytics?.appliedCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted to jobs
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Responses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {analytics?.responsesReceived || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Employer responses
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Response Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {analytics?.responseRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Success rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Application Conversion Funnel
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your progress from resume creation to job offers
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium">Saved</div>
                  <div className="flex-1">
                    <div className="h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-semibold">
                      {analytics?.conversionFunnel?.saved || 0}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium">Applied</div>
                  <div className="flex-1">
                    <div 
                      className="h-12 bg-green-500 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{
                        width: analytics?.conversionFunnel?.saved > 0 
                          ? `${(analytics?.conversionFunnel?.applied / analytics?.conversionFunnel?.saved) * 100}%`
                          : '0%'
                      }}
                    >
                      {analytics?.conversionFunnel?.applied || 0}
                    </div>
                  </div>
                  <div className="w-20 text-sm text-muted-foreground text-right">
                    {analytics?.conversionFunnel?.saved > 0 
                      ? Math.round((analytics?.conversionFunnel?.applied / analytics?.conversionFunnel?.saved) * 100)
                      : 0}%
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium">Interviews</div>
                  <div className="flex-1">
                    <div 
                      className="h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{
                        width: analytics?.conversionFunnel?.saved > 0 
                          ? `${(analytics?.conversionFunnel?.interviews / analytics?.conversionFunnel?.saved) * 100}%`
                          : '0%'
                      }}
                    >
                      {analytics?.conversionFunnel?.interviews || 0}
                    </div>
                  </div>
                  <div className="w-20 text-sm text-muted-foreground text-right">
                    {analytics?.conversionFunnel?.saved > 0 
                      ? Math.round((analytics?.conversionFunnel?.interviews / analytics?.conversionFunnel?.saved) * 100)
                      : 0}%
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium">Offers</div>
                  <div className="flex-1">
                    <div 
                      className="h-12 bg-amber-500 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{
                        width: analytics?.conversionFunnel?.saved > 0 
                          ? `${(analytics?.conversionFunnel?.offers / analytics?.conversionFunnel?.saved) * 100}%`
                          : '0%'
                      }}
                    >
                      {analytics?.conversionFunnel?.offers || 0}
                    </div>
                  </div>
                  <div className="w-20 text-sm text-muted-foreground text-right">
                    {analytics?.conversionFunnel?.saved > 0 
                      ? Math.round((analytics?.conversionFunnel?.offers / analytics?.conversionFunnel?.saved) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ATS Score Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average ATS Score</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Across all tailored resumes
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold text-primary mb-2">
                  {analytics?.averageAtsScore || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Higher scores improve ATS pass-through rates
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg Score (With Responses)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  For resumes that got responses
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold text-green-600 mb-2">
                  {analytics?.avgAtsScoreWithResponses || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  {analytics?.avgAtsScoreWithResponses > analytics?.averageAtsScore 
                    ? 'Higher scoring resumes perform better ✓' 
                    : 'Score impact varies by application'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Successful Resume Versions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Resume Versions That Got Responses
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Learn from successful resume versions
              </p>
            </CardHeader>
            <CardContent>
              {analytics?.versionsWithResponses && analytics.versionsWithResponses.length > 0 ? (
                <div className="space-y-3">
                  {analytics.versionsWithResponses.map((version: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-green-900">{version.jobTitle}</p>
                        <p className="text-sm text-green-700">{version.company}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-white">
                          ATS: {version.atsScore}
                        </Badge>
                        {version.responseDate && (
                          <div className="flex items-center gap-1 text-sm text-green-700">
                            <Calendar className="h-4 w-4" />
                            {new Date(version.responseDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No responses tracked yet. Update resume status when you hear back!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
