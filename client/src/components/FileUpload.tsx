import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  acceptedTypes?: string[];
  maxSize?: number;
  currentFile?: { name: string; size: number; type: string } | null;
  disabled?: boolean;
  className?: string;
}

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  acceptedTypes = ['.pdf', '.docx'],
  maxSize = 10 * 1024 * 1024, // 10MB
  currentFile,
  disabled = false,
  className
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      alert(`Please select a valid file type: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    onFileSelect(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return <FileText className="text-red-500" />;
    }
    return <File className="text-blue-500" />;
  };

  const triggerFileInput = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  if (currentFile) {
    return (
      <Card className={cn("border border-neutral-200 dark:border-neutral-700 shadow-md hover:shadow-lg transition-shadow", className)}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
                {getFileIcon(currentFile.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100" data-testid="current-filename">
                  {currentFile.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatFileSize(currentFile.size)} • {currentFile.type.includes('pdf') ? 'PDF' : 'DOCX'} • Uploaded
                </p>
              </div>
            </div>
            {onFileRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFileRemove}
                className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                data-testid="button-remove-file"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full button-hover"
            onClick={triggerFileInput}
            disabled={disabled}
            data-testid="button-replace-file"
          >
            Replace File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "border-2 border-dashed transition-all duration-300 cursor-pointer group",
        isDragOver && !disabled 
          ? "border-primary bg-primary/5 scale-105 shadow-lg" 
          : "border-neutral-300 dark:border-neutral-600 hover:border-primary/50 hover:bg-neutral-50 dark:hover:bg-neutral-800",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
      data-testid="file-upload-area"
    >
      <CardContent className="p-8 text-center">
        <div className="flex flex-col items-center space-y-3">
          <div className={cn(
            "transition-all duration-300",
            isDragOver ? "animate-float" : "group-hover:animate-float"
          )}>
            <Upload className={cn(
              "w-12 h-12 transition-colors",
              isDragOver ? "text-primary" : "text-neutral-400 group-hover:text-primary"
            )} />
          </div>
          <div className="text-sm">
            <p className="text-neutral-700 dark:text-neutral-300 font-medium mb-1">
              Drop file here or click to browse
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {acceptedTypes.join(', ')} • Max {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          data-testid="file-input"
        />
      </CardContent>
    </Card>
  );
}
