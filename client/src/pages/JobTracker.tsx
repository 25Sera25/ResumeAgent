import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Calendar, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Award,
  Filter,
  Search,
  ArrowLeft,
  Bell
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface JobApplication {
  id: string;
  tailoredResumeId: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  applicationStatus: string;
  appliedDate: string;
  interviewDate?: string;
  followUpDate?: string;
  notes?: string;
  priority: string;
  source?: string;
  contactPerson?: string;
  salary?: string;
  createdAt: string;
}

interface ApplicationStats {
  total: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
}

export default function JobTracker() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({ total: 0, applied: 0, interviews: 0, offers: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, filterStatus, filterPriority]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/job-applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch job applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/job-applications/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.source && app.source.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(app => app.applicationStatus === filterStatus);
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter(app => app.priority === filterPriority);
    }

    setFilteredApplications(filtered);
  };

  const handleUpdateStatus = async (applicationId: string, updates: Partial<JobApplication>) => {
    try {
      const response = await fetch(`/api/job-applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast({
          title: "Updated",
          description: "Application status updated successfully",
          variant: "default",
        });
        fetchApplications();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (applicationId: string) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    
    try {
      const response = await fetch(`/api/job-applications/${applicationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Deleted",
          description: "Application deleted successfully",
          variant: "default",
        });
        fetchApplications();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  const handleScheduleFollowUps = async (applicationId: string) => {
    try {
      const response = await fetch('/api/followups/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobApplicationId: applicationId,
          types: ['1w', '2w'] // Schedule 1-week and 2-week follow-ups by default
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Invalidate all follow-up queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/followups/pending'] });
        queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
        queryClient.invalidateQueries({ queryKey: ['/api/session-stats'] });
        
        toast({
          title: "Follow-ups Scheduled",
          description: `${data.followUps.length} follow-up reminders have been scheduled`,
          variant: "default",
        });
      } else {
        throw new Error('Failed to schedule follow-ups');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule follow-ups",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'interview': return <Users className="w-4 h-4 text-orange-500" />;
      case 'offer': return <Award className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'interview': return 'bg-orange-100 text-orange-800';
      case 'offer': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="text-center">Loading your job applications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/resume-library">
            <Button variant="ghost" size="sm" data-testid="link-resume-library">
              Resume Library
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Job Application Tracker</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Track and manage your job applications</p>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Applied</p>
                <p className="text-2xl font-bold text-blue-600">{stats.applied}</p>
              </div>
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Interviews</p>
                <p className="text-2xl font-bold text-orange-600">{stats.interviews}</p>
              </div>
              <Users className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Offers</p>
                <p className="text-2xl font-bold text-green-600">{stats.offers}</p>
              </div>
              <Award className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <Input
            placeholder="Search by company, job title, or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-applications"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-filter-status">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-48" data-testid="select-filter-priority">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.map((application) => (
          <Card key={application.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">{application.company}</h3>
                      <p className="text-neutral-600">{application.jobTitle}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getStatusColor(application.applicationStatus)}`}>
                        {getStatusIcon(application.applicationStatus)}
                        <span className="ml-1 capitalize">{application.applicationStatus}</span>
                      </Badge>
                      <Badge className={`${getPriorityColor(application.priority)}`}>
                        {application.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Applied: {new Date(application.appliedDate).toLocaleDateString()}
                    </div>
                    {application.source && (
                      <div>Source: {application.source}</div>
                    )}
                    {application.salary && (
                      <div>Salary: {application.salary}</div>
                    )}
                  </div>

                  {application.notes && (
                    <div className="mt-2 p-2 bg-neutral-50 rounded text-sm">
                      <strong>Notes:</strong> {application.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {application.jobUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(application.jobUrl, '_blank')}
                      data-testid={`button-view-job-${application.id}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScheduleFollowUps(application.id)}
                    data-testid={`button-schedule-followups-${application.id}`}
                    title="Schedule follow-up reminders"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>

                  <UpdateStatusDialog
                    application={application}
                    onUpdate={(updates) => handleUpdateStatus(application.id, updates)}
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(application.id)}
                    className="text-red-600 hover:text-red-700"
                    data-testid={`button-delete-${application.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredApplications.length === 0 && (
        <div className="text-center py-12">
          <div className="text-neutral-500">
            {searchTerm || filterStatus !== "all" || filterPriority !== "all"
              ? "No applications match your search criteria" 
              : "No job applications yet. Mark a resume as applied to start tracking!"}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

interface UpdateStatusDialogProps {
  application: JobApplication;
  onUpdate: (updates: Partial<JobApplication>) => void;
}

function UpdateStatusDialog({ application, onUpdate }: UpdateStatusDialogProps) {
  const [status, setStatus] = useState(application.applicationStatus);
  const [notes, setNotes] = useState(application.notes || "");
  const [interviewDate, setInterviewDate] = useState(
    application.interviewDate ? new Date(application.interviewDate).toISOString().split('T')[0] : ""
  );
  const [salary, setSalary] = useState(application.salary || "");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    const updates: Partial<JobApplication> = {
      applicationStatus: status,
      notes: notes || undefined,
      salary: salary || undefined,
    };

    if (interviewDate) {
      updates.interviewDate = new Date(interviewDate).toISOString();
    }

    onUpdate(updates);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-edit-${application.id}`}>
          <Edit3 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Application</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === 'interview' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Interview Date</label>
              <Input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                data-testid="input-interview-date"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Salary (Optional)</label>
            <Input
              placeholder="e.g., $120,000 - $140,000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              data-testid="input-salary"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Add notes about this application..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="textarea-notes"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" data-testid="button-save-updates">
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-updates">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}