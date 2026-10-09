const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectFollowUpLanguage,
  normalizeFollowUpLanguage,
  languageDisplayName,
} = require("../dist/utils/followUpLanguage.js");

test("detects Odia from the Odia script regardless of case preference", () => {
  assert.equal(detectFollowUpLanguage("ଆପଣଙ୍କ ଲକ୍ଷଣ କେବେ ଆରମ୍ଭ ହେଲା?", "english"), "odia");
});

test("detects Hindi from Devanagari regardless of case preference", () => {
  assert.equal(detectFollowUpLanguage("आपके लक्षण कब शुरू हुए?", "odia"), "hindi");
});

test("keeps an English clinician question in English for an Odia patient profile", () => {
  assert.equal(detectFollowUpLanguage("When did your symptoms start?", "odia"), "english");
});

test("uses normalized case language only when the question has no language script", () => {
  assert.equal(detectFollowUpLanguage("12345?", "odia"), "odia");
  assert.equal(normalizeFollowUpLanguage("Odia"), "english");
});

test("returns stable language display names for voice setup", () => {
  assert.equal(languageDisplayName("english"), "English");
  assert.equal(languageDisplayName("hindi"), "Hindi");
  assert.equal(languageDisplayName("odia"), "Odia");
});
