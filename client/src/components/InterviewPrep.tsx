import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Copy, Save, Loader2, Brain, Star } from "lucide-react";

interface InterviewQuestion {
  q: string;
  difficulty: string;
  rationale: string;
  modelAnswer: string;
  starExample?: string;
}

interface InterviewPrepProps {
  sessionId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function InterviewPrep({ sessionId, open, onOpenChange }: InterviewPrepProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set());
  const [savedNotes, setSavedNotes] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const fetchInterviewQuestions = async () => {
    if (questions.length > 0) return; // Already loaded
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/interview-questions`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        throw new Error('Failed to generate interview questions');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate interview questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (index: number) => {
    const newOpen = new Set(openQuestions);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenQuestions(newOpen);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`
    });
  };

  const saveToNotes = (index: number) => {
    setSavedNotes(new Set(savedNotes).add(index));
    toast({
      title: "Saved!",
      description: "Question saved to notes"
    });
  };

  const categorizeQuestions = () => {
    const categories = {
      technical: questions.filter(q => 
        q.q.toLowerCase().includes('sql') || 
        q.q.toLowerCase().includes('database') ||
        q.q.toLowerCase().includes('query') ||
        q.q.toLowerCase().includes('performance') ||
        q.q.toLowerCase().includes('backup') ||
        q.difficulty === 'Hard'
      ),
      behavioral: questions.filter(q => 
        q.q.toLowerCase().includes('tell me about') ||
        q.q.toLowerCase().includes('describe a time') ||
        q.q.toLowerCase().includes('how did you') ||
        q.starExample
      ),
      systemDesign: questions.filter(q => 
        q.q.toLowerCase().includes('design') ||
        q.q.toLowerCase().includes('architecture') ||
        q.q.toLowerCase().includes('scale') ||
        q.q.toLowerCase().includes('disaster recovery')
      )
    };
    
    // Remove duplicates
    const allCategorized = new Set([
      ...categories.technical,
      ...categories.behavioral,
      ...categories.systemDesign
    ]);
    
    const uncategorized = questions.filter(q => !allCategorized.has(q));
    
    return { ...categories, uncategorized };
  };

  const categories = categorizeQuestions();

  const renderQuestionCard = (question: InterviewQuestion, index: number) => {
    const isOpen = openQuestions.has(index);
    const isSaved = savedNotes.has(index);
    
    return (
      <Card key={index} className="mb-4">
        <Collapsible open={isOpen} onOpenChange={() => toggleQuestion(index)}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <div className="flex items-start gap-3 text-left flex-1">
                      <div className="mt-1">
                        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm leading-relaxed">{question.q}</p>
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Badge variant={
                  question.difficulty === 'Hard' ? 'destructive' :
                  question.difficulty === 'Medium' ? 'default' : 'secondary'
                }>
                  {question.difficulty}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Why this question?</p>
                <p className="text-sm text-neutral-700">{question.rationale}</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                    <Brain className="h-4 w-4" />
                    Model Answer
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(question.modelAnswer, 'Answer')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-blue-900 whitespace-pre-line">{question.modelAnswer}</p>
              </div>
              
              {question.starExample && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      STAR Example
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(question.starExample!, 'STAR Example')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-amber-900 whitespace-pre-line">{question.starExample}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(question.q, 'Question')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Question
                </Button>
                <Button
                  size="sm"
                  variant={isSaved ? "secondary" : "outline"}
                  onClick={() => saveToNotes(index)}
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSaved ? 'Saved' : 'Save to Notes'}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const renderCategory = (title: string, categoryQuestions: InterviewQuestion[], icon: React.ReactNode) => {
    if (categoryQuestions.length === 0) return null;
    
    const startIndex = questions.indexOf(categoryQuestions[0]);
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="outline">{categoryQuestions.length}</Badge>
        </div>
        {categoryQuestions.map((q, idx) => 
          renderQuestionCard(q, questions.indexOf(q))
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={fetchInterviewQuestions}>
          <Brain className="h-4 w-4 mr-2" />
          Interview Prep
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Interview Preparation Questions
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Generating interview questions...</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No questions generated yet.</p>
            <Button className="mt-4" onClick={fetchInterviewQuestions}>
              Generate Questions
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Interview Prep Guide:</strong> Review these questions tailored to your target role. 
                Click each question to see model answers and STAR examples based on your experience.
              </p>
            </div>
            
            {renderCategory(
              'Technical Questions',
              categories.technical,
              <Brain className="h-5 w-5 text-blue-600" />
            )}
            
            {renderCategory(
              'Behavioral Questions',
              categories.behavioral,
              <Star className="h-5 w-5 text-amber-600" />
            )}
            
            {renderCategory(
              'System Design & Architecture',
              categories.systemDesign,
              <Brain className="h-5 w-5 text-purple-600" />
            )}
            
            {categories.uncategorized.length > 0 && renderCategory(
              'General Questions',
              categories.uncategorized,
              <Brain className="h-5 w-5 text-gray-600" />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
