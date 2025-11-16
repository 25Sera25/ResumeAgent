import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordMatchVisualizationProps {
  matchedKeywords: string[];
  missingKeywords: string[];
  matchScore?: number;
  className?: string;
}

export default function KeywordMatchVisualization({
  matchedKeywords,
  missingKeywords,
  matchScore,
  className
}: KeywordMatchVisualizationProps) {
  const totalKeywords = matchedKeywords.length + missingKeywords.length;
  const calculatedScore = matchScore ?? Math.round((matchedKeywords.length / totalKeywords) * 100);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className={cn("border border-neutral-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Keyword Match Analysis
          </CardTitle>
          <div className={cn("text-3xl font-bold", getScoreColor(calculatedScore))}>
            {calculatedScore}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-neutral-600">
            <span>Match Score</span>
            <span>
              {matchedKeywords.length} of {totalKeywords} keywords
            </span>
          </div>
          <Progress 
            value={calculatedScore} 
            className="h-3"
            indicatorClassName={getProgressColor(calculatedScore)}
          />
          <p className="text-xs text-neutral-500">
            {calculatedScore >= 80 
              ? "Excellent match! Your resume aligns well with the job requirements." 
              : calculatedScore >= 60 
              ? "Good match with room for improvement. Consider adding missing keywords."
              : "Needs improvement. Focus on incorporating missing keywords naturally."}
          </p>
        </div>

        {/* Matched Keywords */}
        {matchedKeywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-medium text-neutral-700">
                Matched Keywords ({matchedKeywords.length})
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {matchedKeywords.map((keyword, index) => (
                <Badge
                  key={index}
                  className="bg-green-100 text-green-800 hover:bg-green-200"
                  data-testid={`matched-keyword-${index}`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Missing Keywords */}
        {missingKeywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <h4 className="text-sm font-medium text-neutral-700">
                Missing Keywords ({missingKeywords.length})
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.map((keyword, index) => (
                <Badge
                  key={index}
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                  data-testid={`missing-keyword-${index}`}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  {keyword}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-neutral-500 italic">
              Consider incorporating these keywords naturally in your resume where truthful and applicable.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
