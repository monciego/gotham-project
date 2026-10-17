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
