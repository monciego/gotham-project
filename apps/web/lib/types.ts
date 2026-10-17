/** Every Laravel response uses this envelope (see App\Http\Concerns\ApiResponse). */
export type ApiEnvelope<T = null> = {
  success: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]> | null;
};

export type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  timezone: string;
  avatar_url: string | null;
  current_mode: "batman" | "wayne" | "bruce" | "playboy" | "rest";
  total_xp: number;
  current_level: number;
  notification_preferences: Record<string, unknown> | null;
  work_start_time: string | null;
  work_end_time: string | null;
  alfred_aggressiveness: "mild" | "normal" | "intense";
  onboarding_completed: boolean;
  created_at: string;
};
