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
  notes: string | null;
  past_self_message: string | null;
  abandon_reason: string | null;
  completed_at: string | null;
  created_at: string;
  /** Present on list and detail responses, not on HQ. */
  case?: { id: number; name: string; color: string | null } | null;
  subtasks_count?: number;
  subtasks_completed_count?: number;
};

export type MissionStatus = Mission["status"];

export type MissionSummary = Pick<Mission, "id" | "title" | "status" | "priority" | "due_date">;

export type Subtask = { id: number; title: string; completed: boolean; order: number };

export type FocusSession = {
  id: number;
  mission_id: number | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  completed: boolean;
  distractions: number;
  xp_awarded: number;
  /** 1–10. */
  energy_before: number | null;
  /** 1–10. */
  energy_after: number | null;
  notes: string | null;
  mission?: Pick<Mission, "id" | "title" | "status"> | null;
};

export type FocusCompletion = {
  session: FocusSession;
  xp_awarded: number;
  total_xp: number;
  current_level: number;
  level_up: boolean;
  achievements: EarnedTrophy[];
};

export type MissionDetail = Mission & {
  subtasks: Subtask[];
  focus_sessions: FocusSession[];
  total_focus_minutes: number;
  active_session: FocusSession | null;
  dependencies: MissionSummary[];
  dependents: MissionSummary[];
};

export type Paginated<T> = {
  items: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type CaseSummary = {
  id: number;
  name: string;
  status: string;
  color: string | null;
  progress: number;
};

export type EarnedTrophy = {
  key: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
};

export type MissionCompletion = {
  mission: MissionDetail;
  xp_awarded: number;
  total_xp: number;
  current_level: number;
  level_up: boolean;
  achievements: EarnedTrophy[];
};

/** What the create and edit forms send. */
export type MissionInput = {
  title: string;
  description: string | null;
  why_it_matters: string;
  priority: Priority;
  due_date: string;
  due_time: string | null;
  estimated_minutes: number | null;
  case_id: number | null;
  energy_required: Mission["energy_required"];
  tags: string[];
  notes: string | null;
  past_self_message: string | null;
};

export type HabitType = "daily" | "weekly" | "specific_days" | "interval" | "measurable" | "yes_no";

export type HabitCategory = "health" | "productivity" | "learning" | "social" | "mental" | "physical" | "other";

export type Mode = User["current_mode"];

/**
 * `frequency` by type: weekly {times}, specific_days {days: ISO weekdays,
 * 1 = Monday}, interval {every}; empty for the rest.
 */
export type HabitFrequency = { times?: number; days?: number[]; every?: number };

/** A habit with today's state and streaks, as every Arsenal endpoint (and HQ) returns it. */
export type Habit = {
  id: number;
  name: string;
  description: string | null;
  /** Older habits may have a category outside HabitCategory. */
  category: string;
  type: HabitType;
  frequency: HabitFrequency;
  target_value: number | null;
  unit: string | null;
  /** HH:MM. */
  reminder_time: string | null;
  active: boolean;
  /** Empty means every mode. */
  mode_specific: Mode[];
  created_at: string;
  /** On today's list: active, meant for the current mode, and due. */
  active_today: boolean;
  completed: boolean;
  skipped: boolean;
  value: number | null;
  note: string | null;
  current_streak: number;
  best_streak: number;
  streak_unit: "days" | "weeks";
  /** Missing today would end a streak longer than 3. */
  streak_at_risk: boolean;
  week_progress: { done: number; target: number } | null;
  /** This month's completion rate, 0–100, or null before anything was due. */
  month_rate: number | null;
};

/** HQ's name for the same shape. */
export type HabitToday = Habit;

export type HabitCheckIn = {
  habit: Habit;
  /** Negative when undoing a check-in takes XP back. */
  xp_awarded: number;
  total_xp: number;
  current_level: number;
  level_up: boolean;
  /** Set when this completion pushed the streak past 7, 30 or 100. */
  milestone: number | null;
  achievements: EarnedTrophy[];
};

export type HabitLog = {
  id: number;
  date: string;
  completed: boolean;
  skipped: boolean;
  value: number | null;
  note: string | null;
  xp_awarded: number;
  completed_at: string | null;
};

export type HeatmapState = "completed" | "skipped" | "missed" | "pending" | "off" | "none";

export type HabitAnalytics = {
  completion_rate: number | null;
  /** 52 weeks, Sunday to Saturday, oldest first. */
  heatmap: { date: string; state: HeatmapState; value: number | null }[];
  /** Each day's completion rate over the 7 days ending then. */
  last_30_days: { date: string; rate: number | null }[];
  /** ISO weekdays, Monday first. */
  by_weekday: { weekday: number; rate: number | null }[];
};

export type HabitDetail = { habit: Habit; analytics: HabitAnalytics; recent_logs: HabitLog[] };

export type HabitInput = {
  name: string;
  description: string | null;
  category: HabitCategory;
  type: HabitType;
  frequency: HabitFrequency;
  target_value: number | null;
  unit: string | null;
  reminder_time: string | null;
  mode_specific: Mode[];
  active: boolean;
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

