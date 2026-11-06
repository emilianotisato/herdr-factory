// Answering one of factory's questions: the command to run and what to show after.

/**
 * @typedef {{ id: string, text?: string, answer: string[] }} Question
 * @typedef {{ command: string, args: string[] }} Call
 * @typedef {{ code: number, stdout: string, stderr: string }} Result
 */

/**
 * factory's own `answer` argv with the text as its last argument. factory puts
 * every flag before the id because the text is a trailing argument: a flag after
 * it would become answer words, so the argv is never rebuilt. Its first word is
 * always the factory command the sidebar asked for its runs, never one read from
 * the status.
 * @param {Question} question
 * @param {string | null | undefined} factory
 * @param {string} text
 * @returns {Call | null} null when the question carries no `answer` argv
 */
export function answerCall(question, factory, text) {
  const argv = question?.answer;
  if (!Array.isArray(argv) || argv[1] !== "answer") return null;
  return { command: factory || "factory", args: [...argv.slice(1), text] };
}

/** @param {string} text */
export const canSend = (text) => text.trim().length > 0;

/** @param {string} out */
const first = (out) =>
  (out ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean) ?? null;

/**
 * The line a failed answer shows: factory reports some refusals on stdout.
 * @param {Result} result
 */
export function failureLine(result) {
  return (
    first(result.stdout) ??
    first(result.stderr) ??
    `factory exited with code ${result.code}`
  );
}

/** @param {string} runId */
export const fullQuestionHint = (runId) =>
  `full question: factory status ${runId}`;
