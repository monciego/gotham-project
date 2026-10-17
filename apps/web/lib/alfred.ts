/**
 * Everything Alfred says. Components look lines up here instead of
 * hardcoding them, so his voice stays consistent across the app.
 */
const lines = {
  loginTitle: ["Welcome back, sir.", "The cave is ready, sir.", "Good to see you, sir."],
  loginSubtitle: ["Sign in and we'll pick up where we left off."],
  registerTitle: ["Every legend starts somewhere, sir."],
  registerSubtitle: ["Tell me a little about yourself and I'll prepare the cave."],
  forgotTitle: ["It happens to the best of us, sir."],
  forgotSubtitle: ["Give me your email and I'll send a way back in."],
  forgotSent: [
    "If that address is on file, a reset link is on its way. Do check your inbox, sir.",
  ],
  resetTitle: ["A fresh start, sir."],
  resetSubtitle: ["Choose a new password. Something the Riddler couldn't guess."],
  resetDone: ["Your password has been changed, sir. Do sign in."],
  sessionExpired: ["Your session has ended, sir. Shall we sign in again?"],
  greeting: [
    "Good evening, sir. Gotham awaits.",
    "Welcome home, sir. The city is quiet, for now.",
    "Ready when you are, sir.",
  ],
  loggedOut: ["Rest well, sir. Gotham will keep until morning."],
  error: ["Something went wrong on our end, sir. Shall we try again?"],
  hqError: ["I couldn't reach the cave's systems, sir. Shall we try again?"],
  noMission: ["Nothing urgent on the docket, sir. A rare quiet day. Use it well."],
  noMissionsToday: ["No missions due today, sir."],
  noArsenalToday: ["Nothing in the Arsenal today, sir."],
  habitSaveFailed: ["That didn't save, sir. Do try again."],
  arsenalEmpty: ["Your arsenal is empty, sir. A Batman without tools is just a man."],
  arsenalTodayEmpty: ["Nothing due today, sir. Rest is part of the training."],
  arsenalAllDone: ["Every habit done, sir. The Arsenal is fully stocked."],
  arsenalAllDoneDetail: ["Small disciplines, repeated daily. That is how Gotham is won."],
  habitNotFound: ["I can't find that habit, sir."],
  habitCreated: ["Added to the Arsenal, sir."],
  skipIntro: ["A deliberate rest is part of training, sir. The streak stays intact."],
  streakDanger: ["STREAK IN DANGER"],
  streakProtected: ["Streak protected, sir."],
  // Streak milestones. Weekly habits reach them too, so no "days".
  streak7: ["Seven in a row, sir. That's no longer luck. That's discipline."],
  streak30: ["Thirty in a row, sir. Gotham will notice the difference."],
  streak100: ["One hundred in a row, sir. I confess I'm rather proud."],
  comingSoon: ["I'm still preparing this part of the cave, sir. It won't be long."],
  noMissions: ["No missions, sir. Gotham is quiet tonight."],
  noMissionsFiltered: ["Nothing matches that, sir. Perhaps loosen the filters?"],
  whyHelper: ["Alfred won't let you skip this. Your reason is your fuel."],
  missionComplete: ["Well done, sir. Gotham is a little safer tonight."],
  missionCompleteDetail: ["Another one closed."],
  missionAbandoned: ["Understood, sir. Not every battle is ours to fight."],
  sessionStartFailed: ["I couldn't start the session, sir. Shall we try again?"],
  focusActive: ["Focus mode active"],
  focusQuiet: ["Notifications blocked"],
  focusTimeUp: ["MISSION COMPLETE"],
  focusComplete: ["Well done, sir. Gotham is a little safer tonight."],
  focusStopped: ["It still counts, sir. Shall we go again when you're ready?"],
  focusEndEarly: ["End session early?"],
  breakOver: ["Break's over, sir. Ready for another round?"],
  energyThanks: ["Noted, sir."],
  focusNotFound: ["I can't find that session, sir."],
  breakdownIntro: ["Don't think about the whole mission, sir. Just this."],
  breakdownDone: ["You've started. Momentum is everything. Start a full session?"],
  pastSelf: ["Your past self has something to say:"],
  casesEmpty: ["No cases, sir. What is Gotham fighting for?"],
  casesFiltered: ["No cases here, sir."],
  caseNotFound: ["I can't find that case, sir."],
  caseOpened: ["Case opened, sir. Let's see it through."],
  caseClosed: ["Case closed. Batman would be proud."],
  caseCloseIntro: ["Close the file, sir? Open missions stay where they are."],
  caseMissionsEmpty: ["No missions on this case yet, sir. Every case starts with a first step."],
  caseMilestonesEmpty: ["No milestones yet, sir. Mark the waypoints and we'll know how far we've come."],
  // Progress marks (see App\Services\CaseProgress, which posts the same lines).
  caseMark25: ["A quarter of the way, sir. The trail is warming."],
  caseMark50: ["Halfway there, sir. The case is turning in our favor."],
  caseMark75: ["Three quarters done, sir. The end is in sight."],
  caseMark100: ["Every piece is in place, sir. Shall we close the case?"],
  insightsEmpty: ["Insufficient data, sir. Keep using Alfred. Patterns will emerge."],
  overviewError: ["I couldn't gather the numbers, sir. Shall we try again?"],
} as const;

export type AlfredEvent = keyof typeof lines;

/**
 * One of Alfred's lines for an event. Pass `variant` in client components so
 * the server and browser render the same line.
 */
export function say(event: AlfredEvent, variant?: number): string {
  const options = lines[event];
  const index = variant ?? Math.floor(Math.random() * options.length);
  return options[index % options.length]!;
}
