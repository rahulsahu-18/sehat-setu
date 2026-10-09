const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { evaluateSafetyFlags } = require("../dist/utils/triageRules.js");

const names = [
  "CLINICAL_SAFETY_MESSAGE_ENGLISH",
  "CLINICAL_SAFETY_MESSAGE_HINDI",
  "CLINICAL_SAFETY_MESSAGE_ODIA",
];
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});

test("uses a deployment-configured English emergency message", () => {
  process.env.CLINICAL_SAFETY_MESSAGE_ENGLISH = "Synthetic approved message: contact the local emergency service now.";
  const flags = evaluateSafetyFlags(["I cannot breathe"], "english");
  assert.equal(flags.length, 1);
  assert.equal(flags[0].instruction, process.env.CLINICAL_SAFETY_MESSAGE_ENGLISH);
  assert.equal(flags[0].reviewRequired, true);
});

test("uses language-specific approved message without translating or overwriting other languages", () => {
  process.env.CLINICAL_SAFETY_MESSAGE_HINDI = "सिंथेटिक स्वीकृत संदेश";
  process.env.CLINICAL_SAFETY_MESSAGE_ODIA = "କୃତ୍ରିମ ଅନୁମୋଦିତ ବାର୍ତ୍ତା";
  const hindi = evaluateSafetyFlags(["मुझे सांस लेने में दिक्कत है"], "hindi");
  const odia = evaluateSafetyFlags(["ଶ୍ୱାସ ନେବାରେ କଷ୍ଟ"], "odia");
  assert.equal(hindi[0].instruction, process.env.CLINICAL_SAFETY_MESSAGE_HINDI);
  assert.equal(odia[0].instruction, process.env.CLINICAL_SAFETY_MESSAGE_ODIA);
});
