/**
 * Interface for a treasure hunt step
 */
export interface Step {
  id: number;
  title: string;
  subtitle: string;
  coordinates: { lat: number; lng: number };
  hint: string;
  lockedImage?: string;
  lockedVideo?: string;
  unlockedContent: string;
  unlockedImage?: string;
  unlockedVideo?: string;
  isUnlocked: boolean;
  isAccessible: boolean;
  isCurrent: boolean;
  year: number;
}
