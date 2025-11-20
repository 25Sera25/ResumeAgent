import { cn } from "@/lib/utils";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ProgressStep {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'processing';
}

interface SessionStats {
  jobsAnalyzed: number;
  resumesGenerated: number;
  applicationsSent: number;
  followUpsScheduled: number;
}

interface SidebarProps {
  steps: ProgressStep[];
  stats: SessionStats;
  className?: string;
}

export default function Sidebar({ steps, stats, className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile hamburger menu overlay */}
      <div className={cn(
        "lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity",
        isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
      )} onClick={() => setIsCollapsed(true)} />

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 z-50 transition-transform duration-300",
        "w-[280px] sm:w-[300px] flex flex-col",
        isCollapsed && "lg:translate-x-0 -translate-x-full",
        className
      )}>
        {/* Logo & Title */}
        <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-gradient-primary p-1.5 sm:p-2 rounded-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  Resume Agent
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  AI-Powered Tailoring
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden h-9 w-9 p-0 min-w-[36px]"
              onClick={() => setIsCollapsed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Workflow Progress Steps */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-3 sm:mb-4">
                Workflow Progress
              </h3>
              <div className="space-y-1 relative">
                {/* Vertical connecting line */}
                <div className="absolute left-[15px] top-[20px] bottom-[20px] w-[2px] bg-neutral-200 dark:bg-neutral-700" />
                
                {steps.map((step, index) => {
                  const isCompleted = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  const isProcessing = step.status === 'processing';
                  const isActive = isCompleted || isCurrent || isProcessing;

                  return (
                    <div key={step.id} className="relative flex items-start space-x-2 sm:space-x-3 py-2">
                      {/* Progress Ring / Number */}
                      <div className={cn(
                        "relative flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold z-10 transition-all duration-300",
                        isCompleted && "bg-status-success text-white ring-4 ring-green-100 dark:ring-green-900/30",
                        isCurrent && "bg-gradient-primary text-white ring-4 ring-purple-100 dark:ring-purple-900/30 shadow-lg",
                        isProcessing && "bg-gradient-primary text-white ring-4 ring-purple-100 dark:ring-purple-900/30 animate-pulse",
                        !isActive && "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
                      )}>
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        ) : isCompleted ? (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        ) : (
                          step.id
                        )}
                      </div>

                      {/* Step Info */}
                      <div className="flex-1 pt-0.5">
                        <p className={cn(
                          "text-xs sm:text-sm font-semibold transition-colors",
                          isActive ? "text-neutral-800 dark:text-neutral-100" : "text-neutral-500 dark:text-neutral-400"
                        )}>
                          {step.title}
                        </p>
                        <p className={cn(
                          "text-xs transition-colors mt-0.5",
                          isActive ? "text-neutral-600 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-500"
                        )}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Session Stats */}
        <div className="p-4 sm:p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
          <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2 sm:mb-3">
            Session Stats
          </h4>
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Jobs Analyzed</span>
              <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md" data-testid="stat-jobs-analyzed">
                {stats.jobsAnalyzed}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Resumes Generated</span>
              <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-md" data-testid="stat-resumes-generated">
                {stats.resumesGenerated}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Applications Sent</span>
              <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md" data-testid="stat-applications-sent">
                {stats.applicationsSent}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Follow-ups Scheduled</span>
              <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md" data-testid="stat-followups-scheduled">
                {stats.followUpsScheduled}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile hamburger button */}
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "lg:hidden fixed top-4 left-4 z-30 h-11 w-11 p-0 transition-all min-w-[44px]",
          !isCollapsed && "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsCollapsed(false)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Button>
    </>
  );
}
