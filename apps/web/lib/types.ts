/** Every Laravel response uses this envelope (see App\Http\Concerns\ApiResponse). */
export type ApiEnvelope<T = null> = {
  success: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]> | null;
  /** XP, a level and trophies the request earned (App\Support\Rewards). */
  rewards?: Rewards;
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

export type CaseStatus = "planning" | "active" | "on_hold" | "completed" | "archived";

export type CaseColor = "gray" | "blue" | "purple" | "red" | "teal" | "pink";

/** A case as the list returns it. */
export type Case = {
  id: number;
  name: string;
  description: string | null;
  status: CaseStatus;
  category: string | null;
  start_date: string;
  target_end_date: string | null;
  actual_end_date: string | null;
  /** 0–100. */
  progress: number;
  /** `auto` follows the missions; `manual` is set by hand. */
  progress_mode: "auto" | "manual";
  color: CaseColor | null;
  tags: string[];
  /** Cleaned HTML from the editor. */
  notes: string | null;
  xp_awarded: number;
  created_at: string;
  /** Not counting abandoned missions. */
  missions_total: number;
  missions_completed: number;
  /** Against a straight line from start to target; null when closed or without a target. */
  schedule: "on_track" | "behind" | null;
};

export type CaseMilestone = {
  id: number;
  name: string;
  target_date: string;
  completed: boolean;
  completed_at: string | null;
  is_overdue: boolean;
};

export type CaseAnalytics = {
  total_focus_minutes: number;
  missions_total: number;
  missions_completed: number;
  missions_remaining: number;
  missions_per_week: number;
  weeks_elapsed: number;
  /** At the current pace; null without one. */
  estimated_completion: string | null;
  progress_history: { date: string; progress: number }[];
};

export type CaseDetail = Case & {
  missions: Mission[];
  milestones: CaseMilestone[];
  analytics: CaseAnalytics;
};

export type CaseInput = {
  name: string;
  description: string | null;
  status: Exclude<CaseStatus, "completed">;
  category: string | null;
  start_date: string;
  target_end_date: string | null;
  progress_mode: Case["progress_mode"];
  color: CaseColor | null;
  tags: string[];
  notes: string | null;
};

export type CaseCompletion = {
  case: CaseDetail;
  xp_awarded: number;
  total_xp: number;
  current_level: number;
  level_up: boolean;
  achievements: EarnedTrophy[];
};

/** A case's progress passing 25, 50, 75 or 100%. */
export type CaseMark = 25 | 50 | 75 | 100;

export type TrophyRarity = "common" | "rare" | "epic" | "legendary";

export type EarnedTrophy = {
  id: number;
  key: string;
  name: string;
  description: string;
  /** A Lucide icon name (components/trophies/trophy-icons.ts). */
  icon: string;
  rarity: TrophyRarity;
  xp_reward: number;
};

export type MissionCompletion = {
  mission: MissionDetail;
  xp_awarded: number;
  total_xp: number;
  current_level: number;
  level_up: boolean;
  achievements: EarnedTrophy[];
  /** Set when this completion carried its case past a mark. */
  case_milestone: { case_id: number; name: string; milestone: CaseMark } | null;
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

/**
 * A link (`href`), or an `action` the API runs (POST /alfred/messages/{id}/action):
 * show_help, start_mission, force_start:{mission}, abandon:{mission},
 * complete_habit:{habit}, break_streak, switch_mode:{mode}, dismiss.
 */
export type AlfredAction = {
  label: string;
  href?: string;
  action?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

/** What the web does after an action ran. */
export type AlfredActionResult =
  | { type: "redirect"; to: string }
  | { type: "toast"; title: string; message: string }
  | { type: "help"; mission: { id: number; title: string } | null }
  | { type: "none" };

export type AlfredMessageType =
  | "no_start"
  | "task_avoidance"
  | "streak_danger"
  | "session_complete"
  | "burnout_detected"
  | "case_closed"
  | "achievement_unlocked";

export type AlfredMessage = {
  id: number;
  /** Null for free-form messages. */
  type: AlfredMessageType | null;
  priority: Priority;
  mood: AlfredMood;
  title: string;
  message: string;
  actions: AlfredAction[];
  requires_action: boolean;
  action_taken: boolean;
  read_at: string | null;
  dismissed_at: string | null;
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

export type OverviewPeriodName = "week" | "month" | "quarter" | "year" | "custom";

/** Dates are Y-m-d in the user's timezone, both ends included. */
export type OverviewPeriod = { name: OverviewPeriodName; start: string; end: string; days: number };

export type Overview = {
  period: OverviewPeriod;
  key_metrics: {
    total_focus_minutes: number;
    missions_completed: number;
    /** The same number of days just before the period. */
    missions_completed_previous: number;
    /** Percent; null when the previous period had none. */
    missions_change: number | null;
    /** Null when no habit was due. */
    habit_completion_rate: number | null;
    active_streaks_count: number;
    xp_earned: number;
  };
  focus_by_day: { date: string; minutes: number }[];
  /** `week` is the Monday the week starts on. */
  missions_by_week: { week: string; count: number }[];
  /** Null on days no habit was due. */
  habit_heatmap: { date: string; completion_rate: number | null }[];
  /** Journal days only; energy 1–10. */
  energy_trend: { date: string; avg_energy: number }[];
  /** Journal days only; great = 5 … terrible = 1. */
  mood_trend: { date: string; mood_score: number }[];
};

export type InsightCategory = "habit" | "mission" | "energy" | "pattern" | "finance";

export type Insight = { key: string; category: InsightCategory; text: string; confidence: number };

export type Insights = { generated_at: string; days: number; insights: Insight[] };

export type WeeklyReport = {
  week_start: string;
  week_end: string;
  /** This week, before Sunday night's report. */
  in_progress: boolean;
  metrics: {
    focus_minutes: number;
    focus_minutes_previous: number;
    missions_completed: number;
    missions_completed_previous: number;
    habit_completion_rate: number | null;
    intel_entries: number;
    average_mood: number | null;
    average_energy: number | null;
    xp_earned: number;
    spent: number;
    saved: number;
    earned: number;
    cases_closed: number;
  };
  best_day: { date: string; missions_completed: number; focus_minutes: number } | null;
  trophies: string[];
  summary: string;
  generated_at: string;
};

/** missions, cases, arsenal, focus, intel, resources, alfred, progression, special. */
export type TrophyCategory = string;

export type Trophy = EarnedTrophy & {
  category: TrophyCategory;
  earned: boolean;
  earned_at: string | null;
  /** Null for criteria the API doesn't track. */
  progress: { current: number; target: number } | null;
};

export type LevelProgress = {
  current_level: number;
  total_xp: number;
  level_start_xp: number;
  next_level_xp: number;
  xp_into_level: number;
  xp_per_level: number;
};

export type TrophyCase = {
  level: LevelProgress;
  summary: { earned: number; total: number };
  trophies: Trophy[];
};

export type XpEvent = {
  id: number;
  /** Negative when XP was taken back. */
  amount: number;
  reason: string;
  label: string | null;
  total_after: number;
  level_before: number;
  level_after: number;
  created_at: string;
};

/** What a request earned; any successful response may carry it as `rewards`. */
export type Rewards = {
  xp: { amount: number; reason: string; label: string | null }[];
  xp_total: number;
  level_up: { from: number; to: number } | null;
  trophies: (EarnedTrophy & { category: TrophyCategory; earned_at: string })[];
};
