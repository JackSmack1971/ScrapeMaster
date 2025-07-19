import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface JobEventData {
  jobId: string;
  status?: string;
  message?: string;
  recordsProcessed?: number;
  pagesProcessed?: number;
  error?: string;
}

export const NotificationService = {
  /**
   * Displays a toast notification for job events.
   * @param eventType - Type of job event (e.g., 'job:start', 'job:progress', 'job:end', 'job:error')
   * @param data - Data associated with the job event
   */
  showJobNotification(eventType: string, data: JobEventData) {
    const { jobId, status, message, recordsProcessed, pagesProcessed, error } = data;

    let notificationMessage: string;
    let notificationType: 'info' | 'success' | 'error' | 'warning' = 'info';

    switch (eventType) {
      case 'job:start':
        notificationMessage = `Job ${jobId} started.`;
        notificationType = 'info';
        break;
      case 'job:progress':
        notificationMessage = `Job ${jobId}: ${recordsProcessed} records, ${pagesProcessed} pages processed.`;
        notificationType = 'info';
        break;
      case 'job:end':
        notificationMessage = `Job ${jobId} ${status}.`;
        notificationType = status === 'completed' ? 'success' : 'info';
        break;
      case 'job:error':
        notificationMessage = `Job ${jobId} failed: ${error || 'Unknown error'}.`;
        notificationType = 'error';
        break;
      default:
        notificationMessage = message || `Unknown job event for Job ${jobId}.`;
        break;
    }

    toast[notificationType](notificationMessage, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  },

  /**
   * Displays a general success toast notification.
   * @param message - The message to display.
   */
  showSuccess(message: string) {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  },

  /**
   * Displays a general error toast notification.
   * @param message - The message to display.
   */
  showError(message: string) {
    toast.error(message, {
      position: 'top-right',
      autoClose: 7000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  },

  /**
   * Displays a general info toast notification.
   * @param message - The message to display.
   */
  showInfo(message: string) {
    toast.info(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  },

  /**
   * Displays a general warning toast notification.
   * @param message - The message to display.
   */
  showWarning(message: string) {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  },

  /**
   * Placeholder for sending email notifications.
   * @param to - Recipient email address.
   * @param subject - Email subject.
   * @param body - Email body.
   */
  sendEmailNotification(to: string, subject: string, body: string) {
    console.log(`Sending email to ${to} with subject "${subject}":\n${body}`);
    // In a real application, this would integrate with an email service
  },

  /**
   * Placeholder for showing browser notifications (for background jobs).
   * @param title - Notification title.
   * @param options - Notification options.
   */
  showBrowserNotification(title: string, options?: NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, options);
        }
      });
    } else {
      console.warn('Browser notifications not supported or permission denied.');
    }
  },

  /**
   * Sets up alert thresholds for error rates (client-side).
   * This is a conceptual example; actual implementation would involve more complex state management.
   * @param threshold - The error rate percentage threshold.
   * @param callback - Callback function to execute when threshold is met.
   */
  setupErrorRateAlert(threshold: number, callback: (currentRate: number) => void) {
    console.log(`Setting up error rate alert with threshold: ${threshold}%`);
    // Example: monitor error rates and trigger callback
    // This would typically involve listening to job:error events and calculating rates over time.
    // For demonstration, we'll just log.
    // In a real scenario, you'd have a mechanism to track errors and total operations.
    // For instance, if (currentErrorCount / totalOperations) * 100 > threshold, then call callback.
  },
};