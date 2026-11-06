import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerCall,
  canSend,
  failureLine,
  fullQuestionHint,
} from "../mods/factory-answer/lib/answer.js";

const block = {
  id: "Q-3",
  text: "Which store?",
  answer: ["factory", "answer", "--feature", "007", "Q-3"],
};
const ask = {
  id: "Q-2",
  text: "Ship it?",
  answer: ["factory", "answer", "--run", "r-42", "Q-2"],
};

test("the default command runs factory's argv with the text last", () => {
  assert.deepEqual(answerCall(block, undefined, "use sqlite"), {
    command: "factory",
    args: ["answer", "--feature", "007", "Q-3", "use sqlite"],
  });
  assert.deepEqual(answerCall(ask, null, "yes"), {
    command: "factory",
    args: ["answer", "--run", "r-42", "Q-2", "yes"],
  });
});

test("a wrapper command replaces only the first word", () => {
  assert.deepEqual(answerCall(block, "/tmp/fixture-factory", "b"), {
    command: "/tmp/fixture-factory",
    args: ["answer", "--feature", "007", "Q-3", "b"],
  });
});

test("text with spaces and dashes stays one argument", () => {
  const call = answerCall(block, "", "option b --then  ship it");
  assert.equal(call.args.length, 5);
  assert.equal(call.args[4], "option b --then  ship it");
});

test("the question's argv is not changed", () => {
  const argv = [...block.answer];
  answerCall(block, "wrapper", "x");
  assert.deepEqual(block.answer, argv);
});

test("a question without an argv gives no call", () => {
  assert.equal(answerCall({ id: "Q-1", answer: [] }, null, "x"), null);
  assert.equal(answerCall({ id: "Q-1" }, null, "x"), null);
  assert.equal(answerCall(null, null, "x"), null);
});

test("blank text cannot be sent", () => {
  assert.equal(canSend(""), false);
  assert.equal(canSend("  \n"), false);
  assert.equal(canSend(" b "), true);
});

test("a refusal on stdout with an empty stderr shows stdout's first line", () => {
  const line = failureLine({
    code: 1,
    stdout: "\nQ-3 is already resolved (answered 10:02)\nmore\n",
    stderr: "",
  });
  assert.equal(line, "Q-3 is already resolved (answered 10:02)");
});

test("an empty stdout shows stderr's first line", () => {
  assert.equal(
    failureLine({
      code: 2,
      stdout: "  \n",
      stderr: "error: no run r-9\nhelp\n",
    }),
    "error: no run r-9",
  );
});

test("no output at all names the exit code", () => {
  assert.equal(
    failureLine({ code: 3, stdout: "", stderr: "" }),
    "factory exited with code 3",
  );
});

test("the hint names the command that prints the full question", () => {
  assert.equal(fullQuestionHint("a001"), "full question: factory status a001");
});
