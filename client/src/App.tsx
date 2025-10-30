import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ResumeLibrary from "@/pages/ResumeLibrary";
import JobTracker from "@/pages/JobTracker";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/resume-library" component={ResumeLibrary} />
      <Route path="/job-tracker" component={JobTracker} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
