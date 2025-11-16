import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Brain, TrendingUp, BookOpen, ExternalLink, ArrowLeft, BarChart3, Target, AlertCircle } from "lucide-react";

interface SkillCoverage {
  skill: string;
  jobsMentioned: number;
  resumesCovering: number;
  coveragePercent: number;
  category: string;
}

interface LearningResource {
  skill: string;
  resources: Array<{
    title: string;
    url: string;
    type: 'course' | 'documentation' | 'certification' | 'tutorial';
  }>;
}

export default function Insights() {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/insights/skills');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        throw new Error('Failed to fetch insights');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load skills insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core-tech':
        return '🔧';
      case 'tools':
        return '🛠️';
      case 'compliance':
        return '🔒';
      case 'adjacent':
        return '📊';
      default:
        return '📋';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core-tech':
        return 'bg-blue-100 text-blue-800';
      case 'tools':
        return 'bg-purple-100 text-purple-800';
      case 'compliance':
        return 'bg-red-100 text-red-800';
      case 'adjacent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'certification':
        return '🎓';
      case 'course':
        return '📚';
      case 'documentation':
        return '📖';
      case 'tutorial':
        return '🎯';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading insights...</p>
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
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                Skills Gap Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Analyze your skill coverage across job applications and discover learning opportunities
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Jobs Analyzed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {insights?.stats?.totalJobsAnalyzed || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Resumes Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {insights?.stats?.totalResumesGenerated || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {insights?.stats?.averageCoverage || 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Requested Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 30 Most Requested Skills
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Skills most frequently mentioned across job postings you've analyzed
              </p>
            </CardHeader>
            <CardContent>
              {insights?.topRequestedSkills && insights.topRequestedSkills.length > 0 ? (
                <div className="space-y-3">
                  {insights.topRequestedSkills.map((skill: SkillCoverage, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{skill.skill}</span>
                          <Badge variant="outline" className={`text-xs ${getCategoryColor(skill.category)}`}>
                            {getCategoryIcon(skill.category)} {skill.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {skill.jobsMentioned} jobs
                          </span>
                          <span className={`font-semibold ${
                            skill.coveragePercent >= 75 ? 'text-green-600' :
                            skill.coveragePercent >= 50 ? 'text-blue-600' :
                            skill.coveragePercent >= 25 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {skill.coveragePercent}%
                          </span>
                        </div>
                      </div>
                      <Progress value={skill.coveragePercent} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No data yet. Start analyzing job postings to see insights!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills Gap & Learning Roadmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skills Gap & Learning Roadmap
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Focus areas to improve your resume coverage
              </p>
            </CardHeader>
            <CardContent>
              {insights?.missingSkills && insights.missingSkills.length > 0 ? (
                <div className="space-y-4">
                  {insights.missingSkills.map((skill: SkillCoverage, idx: number) => (
                    <div key={idx} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-amber-900">{skill.skill}</span>
                        <Badge variant="outline" className="text-xs">
                          {skill.jobsMentioned} jobs need this
                        </Badge>
                      </div>
                      <Progress value={skill.coveragePercent} className="h-2 mb-2" />
                      <p className="text-xs text-amber-700">
                        Coverage: {skill.coveragePercent}% • Consider adding to your skills
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Great! No significant skills gaps detected.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recommended Learning Resources
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Courses, certifications, and documentation to fill your skills gaps
              </p>
            </CardHeader>
            <CardContent>
              {insights?.learningRoadmap && insights.learningRoadmap.length > 0 ? (
                <div className="space-y-6">
                  {insights.learningRoadmap.map((learning: LearningResource, idx: number) => (
                    <div key={idx} className="border-l-4 border-primary pl-4">
                      <h4 className="font-semibold mb-3">{learning.skill}</h4>
                      <div className="space-y-2">
                        {learning.resources.map((resource, ridx) => (
                          <a
                            key={ridx}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getResourceIcon(resource.type)}</span>
                              <div>
                                <p className="font-medium group-hover:text-primary transition-colors">
                                  {resource.title}
                                </p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {resource.type}
                                </Badge>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No learning recommendations yet. Analyze more job postings!
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
