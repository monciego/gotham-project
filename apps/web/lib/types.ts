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


export type IntelMood = "great" | "good" | "okay" | "bad" | "terrible";

export type IntelEntry = {
  id: number;
  /** Y-m-d. */
  date: string;
  /** Sanitized HTML from the editor. */
  content: string;
  /** The first 100 characters of the text. */
  excerpt: string;
  mood: IntelMood;
  energy_level: number;
  stress_level: number;
  gratitude: string | null;
  wins: string | null;
  struggles: string | null;
  tags: string[];
  sentiment: number | null;
  sentiment_label: "positive" | "neutral" | "negative" | null;
  created_at: string;
  updated_at: string;
};

export type IntelDetail = { entry: IntelEntry; previous_id: number | null; next_id: number | null };

export type IntelFiled = {
  entry: IntelEntry;
  xp_awarded: number;
  total_xp: number;
  current_level: number;
  level_up: boolean;
  achievements: EarnedTrophy[];
};

export type IntelInput = {
  date: string;
  content: string;
  mood: IntelMood;
  energy_level: number;
  stress_level: number;
  gratitude: string | null;
  wins: string | null;
  struggles: string | null;
  tags: string[];
};

export type IntelPrompt = { prompt: string; reason: string };

export type IntelInsights = {
  entries_this_month: number;
  /** Consecutive days with an entry, up to today or yesterday. */
  streak: number;
  mood_average: { score: number; mood: IntelMood } | null;
  /** The last 7 days, oldest first. */
  mood_trend: { date: string; mood: IntelMood | null }[];
  /** Average over the last 7 days. */
  average_energy: number | null;
  top_tags: { tag: string; count: number }[];
};

export type TransactionType = "income" | "expense";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  /** Y-m-d. */
  date: string;
  account: string | null;
  /** A template the scheduler copies on each due date. */
  recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
  /** Set on copies made from a recurring template. */
  recurring_source_id: number | null;
  savings_goal_id: number | null;
  created_at: string;
};

export type TransactionInput = {
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  account: string | null;
  recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
};

export type ResourceSummary = {
  /** YYYY-MM. */
  month: string;
  income: number;
  expenses: number;
  net: number;
  /** This month's expenses, largest first. */
  by_category: { category: string; amount: number }[];
  /** The six months up to `month`, oldest first. */
  history: { month: string; income: number; expenses: number }[];
};

export type ResourceCategories = Record<TransactionType, string[]>;

export type BudgetRow = {
  /** Null while carried over from an earlier month and not yet saved for this one. */
  id: number | null;
  category: string;
  monthly_limit: number;
  spent: number;
  remaining: number;
  percentage: number | null;
};

export type BudgetMonth = {
  month: string;
  /** The budgets come from `from`, an earlier month, until saved for this one. */
  carried_over: boolean;
  from: string | null;
  budgets: BudgetRow[];
  /** Categories spent on this month without a budget. */
  unbudgeted: { category: string; spent: number }[];
  total_limit: number;
  total_spent: number;
};

export type BudgetRecommendation = { category: string; average: number; suggested: number };

export type SavingsGoal = {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  /** 0–100. */
  percentage: number;
  deadline: string | null;
  /** Negative once the deadline has passed. */
  days_left: number | null;
  /** Where an even pace from creation to the deadline would be today. */
  expected_amount: number | null;
  /** Null without a deadline. */
  on_track: boolean | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  contributions?: Transaction[];
};

export type SavingsGoalInput = { name: string; target_amount: number; deadline: string | null };

export type Contribution =
  | { resource_id: number }
  | { amount: number; date?: string; account?: string | null; description?: string | null };

export type OperationCategory = "work" | "personal" | "health" | "social" | "other";

/** Gold and green are kept for missions, focus blocks and habits. */
export type OperationColor = "gray" | "blue" | "purple" | "red" | "teal" | "pink";

export type RecurringRule = { freq: RecurringFrequency; until?: string | null };

/**
 * One thing on the calendar: an event (or one occurrence of a recurring
 * one), a focus block, or a habit with a reminder time (read-only).
 * Timed entries use UTC ISO 8601; all-day entries use dates, `end` exclusive.
 */
export type CalendarEntry = {
  id: string;
  operation_id: number | null;
  habit_id?: number;
  occurrence?: number | null;
  kind: "event" | "focus_block" | "habit";
  title: string;
  description?: string | null;
  start: string;
  end: string;
  /** The series' own times; equal to start and end for one-off events. */
  series_start?: string;
  series_end?: string;
  all_day: boolean;
  category: string;
  color?: OperationColor | null;
  recurring?: boolean;
  recurring_rule?: RecurringRule | null;
  reminder_minutes?: number | null;
  mission?: Pick<Mission, "id" | "title" | "status"> | null;
  editable: boolean;
};

/**
 * Timed: `start`/`end` are ISO 8601 instants. All-day: dates, `end` the day
 * after the last.
 */
export type OperationInput = {
  title: string;
  description: string | null;
  all_day: boolean;
  start: string;
  end: string;
  category: OperationCategory;
  color: OperationColor | null;
  recurring: boolean;
  recurring_rule: RecurringRule | null;
  reminder_minutes: number | null;
  mission_id: number | null;
};
