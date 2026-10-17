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
  energy_before: number | null;
  energy_after: number | null;
  notes: string | null;
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
