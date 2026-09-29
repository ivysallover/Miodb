import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { hasAnalyticsConsent } from '@/components/CookieConsentBanner';

export type SystemEventType = 
  | 'app_start'
  | 'auth_login' 
  | 'auth_signup'
  | 'analysis_success'
  | 'analysis_error'
  | 'chat_session_started'
  | 'project_saved';

// Strip any potential PII keys to ensure strict data minimization
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  const forbiddenKeys = ['email', 'password', 'token', 'raw_data', 'csv_content', 'phone', 'address'];

  for (const [key, value] of Object.entries(metadata)) {
    if (forbiddenKeys.includes(key.toLowerCase())) {
      continue; // Exclude PII
    }
    // Only allow primitive types or simple arrays/objects
    if (typeof value === 'string' && value.length > 200) {
      clean[key] = value.substring(0, 200) + '...[truncated]';
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export function logSystemEvent(type: SystemEventType, metadata: Record<string, any> = {}) {
  // Only transmit telemetry if user has given consent (or in non-browser server context)
  if (typeof window !== 'undefined' && !hasAnalyticsConsent()) {
    return;
  }

  const sanitized = sanitizeMetadata(metadata);

  // Fire and forget
  addDoc(collection(db, 'system_logs'), {
    type,
    ...sanitized,
    timestamp: serverTimestamp(),
  }).catch((err) => {
    // Silently ignore to not interrupt user flow
    console.warn('Could not log system event:', err.message);
  });
}

