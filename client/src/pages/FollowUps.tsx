import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Mail, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  Filter,
  Search,
  ArrowLeft,
  CheckSquare,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

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

export default function FollowUps() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedFollowUps, setSelectedFollowUps] = useState<Set<string>>(new Set());

  // Fetch all follow-ups (not just pending)
  const { data: allFollowUps = [], isLoading } = useQuery<FollowUp[]>({
    queryKey: ['/api/followups'],
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
      toast({
        title: "Follow-up Skipped",
        description: "Follow-up has been skipped.",
      });
    },
  });

  // Delete follow-up mutation
  const deleteFollowUpMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      return await apiRequest(`/api/followups/${followUpId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
      toast({
        title: "Follow-up Deleted",
        description: "Follow-up has been deleted.",
      });
    },
  });

  // Bulk mark as sent
  const bulkMarkAsSent = async () => {
    const promises = Array.from(selectedFollowUps).map(id =>
      apiRequest(`/api/followups/${id}`, {
        method: 'PATCH',
        body: { status: 'sent', sentAt: new Date().toISOString() },
      })
    );
    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
    queryClient.invalidateQueries({ queryKey: ['/api/session-stats'] });
    setSelectedFollowUps(new Set());
    toast({
      title: "Bulk Action Complete",
      description: `Marked ${promises.length} follow-ups as sent.`,
    });
  };

  // Bulk delete
  const bulkDelete = async () => {
    const promises = Array.from(selectedFollowUps).map(id =>
      apiRequest(`/api/followups/${id}`, { method: 'DELETE' })
    );
    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
    setSelectedFollowUps(new Set());
    toast({
      title: "Bulk Action Complete",
      description: `Deleted ${promises.length} follow-ups.`,
    });
  };

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

  const toggleFollowUpSelection = (id: string) => {
    const newSelection = new Set(selectedFollowUps);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedFollowUps(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedFollowUps.size === filteredFollowUps.length) {
      setSelectedFollowUps(new Set());
    } else {
      setSelectedFollowUps(new Set(filteredFollowUps.map(f => f.id)));
    }
  };

  // Apply filters
  let filteredFollowUps = allFollowUps;

  // Filter by status
  if (filterStatus !== "all") {
    filteredFollowUps = filteredFollowUps.filter(f => f.status === filterStatus);
  }

  // Filter by type
  if (filterType !== "all") {
    filteredFollowUps = filteredFollowUps.filter(f => f.type === filterType);
  }

  // Search filter
  if (searchQuery) {
    filteredFollowUps = filteredFollowUps.filter(followUp => {
      const application = getApplicationForFollowUp(followUp);
      const searchLower = searchQuery.toLowerCase();
      return (
        application?.jobTitle?.toLowerCase().includes(searchLower) ||
        application?.company?.toLowerCase().includes(searchLower) ||
        getFollowUpTypeLabel(followUp.type).toLowerCase().includes(searchLower)
      );
    });
  }

  const pendingCount = allFollowUps.filter(f => f.status === 'pending').length;
  const overdueCount = allFollowUps.filter(f => f.status === 'pending' && isOverdue(f.dueAt)).length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                  <Mail className="w-6 h-6" />
                  Follow-Ups
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Manage your job application follow-ups
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {pendingCount} Pending
              </Badge>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  {overdueCount} Overdue
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      placeholder="Search by job title or company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="1w">1-Week Check-in</SelectItem>
                      <SelectItem value="2w">2-Week Nudge</SelectItem>
                      <SelectItem value="thank_you">Thank You</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedFollowUps.size > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">
                      {selectedFollowUps.size} follow-up{selectedFollowUps.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={bulkMarkAsSent}
                      className="gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Mark as Sent
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={bulkDelete}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedFollowUps(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-ups List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Follow-Ups</CardTitle>
                  <CardDescription>
                    {filteredFollowUps.length} follow-up{filteredFollowUps.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                {filteredFollowUps.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    {selectedFollowUps.size === filteredFollowUps.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredFollowUps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                  <p className="text-lg font-medium mb-2">No follow-ups found</p>
                  <p className="text-sm">
                    {searchQuery || filterType !== 'all' || filterStatus !== 'pending'
                      ? "Try adjusting your filters"
                      : "Schedule follow-ups from the Job Tracker"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFollowUps.map(followUp => {
                    const application = getApplicationForFollowUp(followUp);
                    const overdue = isOverdue(followUp.dueAt) && followUp.status === 'pending';
                    const hasEmail = followUp.emailSubject && followUp.emailBody;
                    const isSelected = selectedFollowUps.has(followUp.id);

                    return (
                      <div
                        key={followUp.id}
                        className={cn(
                          "border rounded-lg p-4 space-y-3 bg-white dark:bg-neutral-800 transition-all",
                          overdue && "border-status-warning bg-orange-50 dark:bg-orange-950/20",
                          isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFollowUpSelection(followUp.id)}
                            className="mt-1 w-4 h-4 rounded border-neutral-300"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold text-sm">
                                {application?.jobTitle || 'Unknown Position'}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {getFollowUpTypeLabel(followUp.type)}
                              </Badge>
                              <Badge variant={followUp.status === 'sent' ? 'default' : 'secondary'} className="text-xs">
                                {followUp.status}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive" className="gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                              {hasEmail && followUp.status === 'pending' && (
                                <Badge className="gap-1 text-xs bg-status-success text-white">
                                  <Check className="h-3 w-3" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {application?.company || 'Unknown Company'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Due: {format(new Date(followUp.dueAt), 'MMM d, yyyy')}
                              {followUp.sentAt && ` • Sent: ${format(new Date(followUp.sentAt), 'MMM d, yyyy')}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 ml-7">
                          {!hasEmail && followUp.status === 'pending' ? (
                            <Button
                              onClick={() => generateEmailMutation.mutate(followUp.id)}
                              disabled={generateEmailMutation.isPending}
                              size="sm"
                              className="gap-1.5 h-8 text-xs"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {generateEmailMutation.isPending ? 'Generating...' : 'Generate Email'}
                            </Button>
                          ) : hasEmail ? (
                            <Dialog open={expandedId === followUp.id} onOpenChange={(open) => setExpandedId(open ? followUp.id : null)}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                                  <Mail className="h-3.5 w-3.5" />
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
                                      >
                                        {copiedId === followUp.id + 'subject' ? (
                                          <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                        Copy
                                      </Button>
                                    </div>
                                    <div className="bg-muted p-3 rounded-md text-sm">
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
                                    />
                                  </div>
                                  {followUp.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => {
                                          markAsSentMutation.mutate(followUp.id);
                                          setExpandedId(null);
                                        }}
                                        className="flex-1"
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
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        Skip
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : null}
                          
                          {followUp.status === 'pending' && (
                            <>
                              {hasEmail && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsSentMutation.mutate(followUp.id)}
                                  disabled={markAsSentMutation.isPending}
                                  className="h-8 text-xs gap-1.5"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Mark Sent
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => skipFollowUpMutation.mutate(followUp.id)}
                                disabled={skipFollowUpMutation.isPending}
                                className="h-8 text-xs"
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Skip
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFollowUpMutation.mutate(followUp.id)}
                            disabled={deleteFollowUpMutation.isPending}
                            className="h-8 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
