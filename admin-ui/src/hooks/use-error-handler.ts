import { useCallback } from 'react';
import { toast } from 'sonner';

export function useErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    let message = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String(error.message);
    }

    // Check for specific error types and show user-friendly messages
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      toast.error('Connection Error', {
        description: 'Please check your internet connection and try again.',
      });
    } else if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
      toast.error('Authentication Required', {
        description: 'Please log in to continue.',
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login',
        },
      });
    } else if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
      toast.error('Access Denied', {
        description: 'You do not have permission to perform this action.',
      });
    } else if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      toast.error('Not Found', {
        description: 'The requested resource could not be found.',
      });
    } else if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      toast.error('Too Many Requests', {
        description: 'Please wait a moment before trying again.',
      });
    } else if (lowerMessage.includes('server error') || lowerMessage.includes('500')) {
      toast.error('Server Error', {
        description: 'Something went wrong on our end. Please try again later.',
      });
    } else {
      // Generic error message
      toast.error('Error', {
        description: 'Something went wrong. Please try again.',
      });
    }

    // Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', error);
    }
  }, []);

  return { handleError };
}