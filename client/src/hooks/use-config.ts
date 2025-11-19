import { useQuery } from '@tanstack/react-query';

interface AppConfig {
  manualUploadOnly: boolean;
}

export function useConfig() {
  const { data, isLoading } = useQuery<AppConfig>({
    queryKey: ['/api/config'],
    staleTime: Infinity, // Config doesn't change during runtime
  });

  return {
    config: data ?? { manualUploadOnly: false },
    isLoading,
    manualUploadOnly: data?.manualUploadOnly ?? false,
  };
}
