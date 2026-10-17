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
  daily_focus_goal_minutes: number;
  created_at: string;
};

export type Priority = "critical" | "high" | "medium" | "low";

export type Mission = {
  id: number;
  case_id: number | null;
  title: string;
  description: string | null;
  why_it_matters: string;
  priority: Priority;
  status: "not_started" | "in_progress" | "completed" | "abandoned";
  due_date: string;
  due_time: string | null;
  is_overdue: boolean;
  estimated_minutes: number | null;
  actual_minutes: number;
  times_postponed: number;
  energy_required: "high" | "medium" | "low";
  tags: string[];
  completed_at: string | null;
};

/** A habit with today's state, as HQ shows it. */
export type HabitToday = {
  id: number;
  name: string;
  category: string;
  type: "daily" | "weekly" | "specific_days" | "interval" | "measurable" | "yes_no";
  target_value: number | null;
  unit: string | null;
  completed: boolean;
  value: number | null;
  current_streak: number;
  best_streak: number;
  streak_unit: "days" | "weeks";
  week_progress: { done: number; target: number } | null;
};

export type AlfredMood = "concerned" | "proud" | "disappointed" | "encouraging";

export type AlfredAction = { label: string; href?: string };

export type AlfredMessage = {
  id: number;
  priority: Priority;
  mood: AlfredMood;
  title: string;
  message: string;
  actions: AlfredAction[];
  requires_action: boolean;
  read_at: string | null;
  created_at: string;
};

export type Dashboard = {
  morning_brief: {
    greeting: string;
    mission: Mission | null;
    habits: HabitToday[];
    quote: { text: string; author: string };
  };
  stats: {
    mission_success: {
      completed_today: number;
      total_due_today: number;
      percentage: number;
      yesterday_percentage: number;
    };
    longest_streak: { habit_name: string; streak_count: number; streak_unit: "days" | "weeks" } | null;
    focus_time: { minutes_today: number; goal_minutes: number; percentage: number };
  };
  todays_missions: Mission[];
  todays_arsenal: HabitToday[];
  alfred_alerts: AlfredMessage[];
};

export type HabitCompletion = {
  habit: Pick<HabitToday, "id" | "completed" | "current_streak" | "best_streak" | "streak_unit">;
  /** Set when this completion pushed the streak past 7, 30 or 100. */
  milestone: number | null;
};
