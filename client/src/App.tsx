import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ResumeLibrary from "@/pages/ResumeLibrary";
import JobTracker from "@/pages/JobTracker";
import FollowUps from "@/pages/FollowUps";
import Login from "@/pages/Login";
import AdminUsers from "@/pages/AdminUsers";
import Insights from "@/pages/Insights";
import ResumeAnalytics from "@/pages/ResumeAnalytics";
import InterviewPrep from "@/pages/InterviewPrep";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      
      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path="/resume-library">
        <ProtectedRoute>
          <ResumeLibrary />
        </ProtectedRoute>
      </Route>
      <Route path="/job-tracker">
        <ProtectedRoute>
          <JobTracker />
        </ProtectedRoute>
      </Route>
      <Route path="/follow-ups">
        <ProtectedRoute>
          <FollowUps />
        </ProtectedRoute>
      </Route>
      <Route path="/insights">
        <ProtectedRoute>
          <Insights />
        </ProtectedRoute>
      </Route>
      <Route path="/resume-analytics">
        <ProtectedRoute>
          <ResumeAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/interview-prep">
        <ProtectedRoute>
          <InterviewPrep />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute>
          <AdminUsers />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="resume-agent-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
