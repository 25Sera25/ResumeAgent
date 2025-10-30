import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Mail, Copy, Check, X, Sparkles, Clock, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Link } from "wouter";

interface FollowUp {
  id: string;
  jobApplicationId: string;
  dueAt: string;
  type: string;
  status: string;
  emailSubject: string | null;
  emailBody: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobApplication {
  id: string;
  jobTitle: string;
  company: string;
  applicationStatus: string;
}

interface FollowUpQueueProps {
  compact?: boolean;
}

export default function FollowUpQueue({ compact = false }: FollowUpQueueProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch pending follow-ups
  const { data: allFollowUps = [], isLoading } = useQuery<FollowUp[]>({
    queryKey: ['/api/followups/pending'],
  });

  // In compact mode, show only top 3 most urgent follow-ups
  const followUps = compact ? allFollowUps.slice(0, 3) : allFollowUps;
  const hasMoreFollowUps = compact && allFollowUps.length > 3;

  // Fetch job applications to get job details
  const { data: applications = [] } = useQuery<JobApplication[]>({
    queryKey: ['/api/job-applications'],
  });

  // Generate email mutation
  const generateEmailMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      return await apiRequest(`/api/followups/${followUpId}/generate-email`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/followups/pending'] });
      toast({
        title: "Email Generated",
        description: "Follow-up email has been generated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark as sent mutation
  const markAsSentMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      return await apiRequest(`/api/followups/${followUpId}`, {
        method: 'PATCH',
        body: { status: 'sent', sentAt: new Date().toISOString() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/followups/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/followups/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/session-stats'] });
      toast({
        title: "Marked as Sent",
        description: "Follow-up has been marked as sent!",
      });
    },
  });

  // Skip follow-up mutation
  const skipFollowUpMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      return await apiRequest(`/api/followups/${followUpId}`, {
        method: 'PATCH',
        body: { status: 'skipped' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/followups/pending'] });
      toast({
        title: "Follow-up Skipped",
        description: "Follow-up has been skipped.",
      });
    },
  });

  const copyToClipboard = async (text: string, followUpId: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(followUpId + label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getFollowUpTypeLabel = (type: string) => {
    switch (type) {
      case '1w':
        return '1-Week Check-in';
      case '2w':
        return '2-Week Nudge';
      case 'thank_you':
        return 'Thank You (Post-Interview)';
      default:
        return type;
    }
  };

  const getApplicationForFollowUp = (followUp: FollowUp) => {
    return applications.find(app => app.id === followUp.jobApplicationId);
  };

  const isOverdue = (dueAt: string) => {
    return new Date(dueAt) < new Date();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Follow-Up Queue
          </CardTitle>
          <CardDescription>Loading your follow-ups...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (followUps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Follow-Up Queue
          </CardTitle>
          <CardDescription>You're all caught up! No pending follow-ups.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>All follow-ups are complete. Schedule new ones from the Job Tracker.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Follow-Up Queue
          <Badge variant="secondary">{allFollowUps.length} pending</Badge>
        </CardTitle>
        <CardDescription>
          {compact 
            ? "Top 3 most urgent follow-ups - generate and send emails to stay top-of-mind" 
            : "Generate and send follow-up emails to stay top-of-mind with employers"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {followUps.map(followUp => {
            const application = getApplicationForFollowUp(followUp);
            const overdue = isOverdue(followUp.dueAt);
            const hasEmail = followUp.emailSubject && followUp.emailBody;

            return (
              <div
                key={followUp.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  overdue ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : ''
                }`}
                data-testid={`followup-${followUp.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base" data-testid={`followup-job-title-${followUp.id}`}>
                        {application?.jobTitle || 'Unknown Position'}
                      </h4>
                      <Badge variant="outline">{getFollowUpTypeLabel(followUp.type)}</Badge>
                      {overdue && (
                        <Badge variant="destructive" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`followup-company-${followUp.id}`}>
                      {application?.company || 'Unknown Company'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Due: {format(new Date(followUp.dueAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!hasEmail ? (
                    <Button
                      onClick={() => generateEmailMutation.mutate(followUp.id)}
                      disabled={generateEmailMutation.isPending}
                      size="sm"
                      className="gap-2"
                      data-testid={`button-generate-email-${followUp.id}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      {generateEmailMutation.isPending ? 'Generating...' : 'Generate Email'}
                    </Button>
                  ) : (
                    <Dialog open={expandedId === followUp.id} onOpenChange={(open) => setExpandedId(open ? followUp.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" data-testid={`button-view-email-${followUp.id}`}>
                          <Mail className="h-4 w-4" />
                          View Email
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Follow-Up Email - {getFollowUpTypeLabel(followUp.type)}</DialogTitle>
                          <DialogDescription>
                            {application?.jobTitle} at {application?.company}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">Subject</label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(followUp.emailSubject!, followUp.id, 'subject')}
                                className="gap-2"
                                data-testid={`button-copy-subject-${followUp.id}`}
                              >
                                {copiedId === followUp.id + 'subject' ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                                Copy
                              </Button>
                            </div>
                            <div className="bg-muted p-3 rounded-md text-sm" data-testid={`text-email-subject-${followUp.id}`}>
                              {followUp.emailSubject}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">Body</label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(followUp.emailBody!, followUp.id, 'body')}
                                className="gap-2"
                                data-testid={`button-copy-body-${followUp.id}`}
                              >
                                {copiedId === followUp.id + 'body' ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                                Copy
                              </Button>
                            </div>
                            <Textarea
                              value={followUp.emailBody || ''}
                              readOnly
                              className="min-h-[300px] font-mono text-sm"
                              data-testid={`textarea-email-body-${followUp.id}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                markAsSentMutation.mutate(followUp.id);
                                setExpandedId(null);
                              }}
                              className="flex-1"
                              data-testid={`button-mark-sent-${followUp.id}`}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Sent
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                skipFollowUpMutation.mutate(followUp.id);
                                setExpandedId(null);
                              }}
                              data-testid={`button-skip-${followUp.id}`}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Skip
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {hasEmail && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skipFollowUpMutation.mutate(followUp.id)}
                      disabled={skipFollowUpMutation.isPending}
                      data-testid={`button-skip-inline-${followUp.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {hasMoreFollowUps && (
          <div className="mt-4 pt-4 border-t">
            <Link href="/job-tracker">
              <Button variant="outline" className="w-full gap-2" data-testid="button-view-all-followups">
                View All {allFollowUps.length} Follow-ups
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
