import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

interface ProgressStep {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'processing';
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  className?: string;
}

export default function ProgressTracker({ steps, className }: ProgressTrackerProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Workflow Progress</h3>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step.status === 'completed' && "bg-primary text-white",
                step.status === 'current' && "bg-primary text-white",
                step.status === 'processing' && "bg-primary text-white",
                step.status === 'pending' && "bg-neutral-200 text-neutral-500"
              )}>
                {step.status === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  step.id
                )}
              </div>
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  (step.status === 'completed' || step.status === 'current' || step.status === 'processing') && "text-primary",
                  step.status === 'pending' && "text-neutral-500"
                )}>
                  {step.title}
                </p>
                <p className={cn(
                  "text-xs",
                  (step.status === 'completed' || step.status === 'current' || step.status === 'processing') && "text-neutral-500",
                  step.status === 'pending' && "text-neutral-400"
                )}>
                  {step.description}
                </p>
              </div>
              {step.status === 'completed' && (
                <Check className="w-4 h-4 text-primary" />
              )}
              {step.status === 'processing' && (
                <div className="w-4 h-4 border-2 border-primary rounded-full animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
