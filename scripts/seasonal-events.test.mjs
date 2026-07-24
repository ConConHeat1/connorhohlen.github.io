import assert from "node:assert/strict";
import test from "node:test";

import {
  SEASONAL_EVENT_BY_ID,
  SEASONAL_EVENT_IDS,
  SEASONAL_EVENTS,
  getEasterDate,
  getSpecialEventForDate,
  nthWeekdayOfMonth,
  resolveEventPreview,
} from "../assets/js/seasonal/events.mjs";

const expectedIds = [
  "new-year",
  "valentines-day",
  "st-patricks-day",
  "easter",
  "earth-day",
  "mothers-day",
  "fathers-day",
  "independence-day",
  "halloween",
  "thanksgiving",
  "christmas",
];

function localDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 12);
}

function parts(date) {
  return [date.getFullYear(), date.getMonth(), date.getDate()];
}

function eventId(year, monthIndex, day) {
  return getSpecialEventForDate(localDate(year, monthIndex, day))?.id ?? null;
}

test("event configuration contains exactly the eleven supported frozen events", () => {
  assert.deepEqual(SEASONAL_EVENT_IDS, expectedIds);
  assert.deepEqual(
    SEASONAL_EVENTS.map(({ id }) => id),
    expectedIds,
  );
  assert.equal(Object.isFrozen(SEASONAL_EVENTS), true);
  assert.equal(Object.isFrozen(SEASONAL_EVENT_IDS), true);
  assert.equal(Object.isFrozen(SEASONAL_EVENT_BY_ID), true);

  for (const event of SEASONAL_EVENTS) {
    assert.equal(Object.isFrozen(event), true);
    assert.equal(Object.isFrozen(event.greetings), true);
    assert.equal(SEASONAL_EVENT_BY_ID[event.id], event);
    assert.match(event.label, /\S/);
    assert.match(event.previewLabel, /\S/);
    assert.match(event.greetings.default, /\S/);
    assert.equal(event.modulePath, `./scenes/${event.id}.mjs`);
  }
});

test("nthWeekdayOfMonth returns local dates and rejects missing fifth occurrences", () => {
  assert.deepEqual(parts(nthWeekdayOfMonth(2026, 4, 0, 2)), [2026, 4, 10]);
  assert.deepEqual(parts(nthWeekdayOfMonth(2027, 5, 0, 3)), [2027, 5, 20]);
  assert.deepEqual(parts(nthWeekdayOfMonth(2026, 10, 4, 4)), [2026, 10, 26]);
  assert.equal(nthWeekdayOfMonth(2026, 1, 1, 5), null);
});

test("Western Gregorian Easter dates are exact for 2026 through 2028", () => {
  assert.deepEqual(parts(getEasterDate(2026)), [2026, 3, 5]);
  assert.deepEqual(parts(getEasterDate(2027)), [2027, 2, 28]);
  assert.deepEqual(parts(getEasterDate(2028)), [2028, 3, 16]);
});

test("every fixed-date event activates only on its date", () => {
  const fixedEvents = [
    ["valentines-day", 1, 14],
    ["st-patricks-day", 2, 17],
    ["earth-day", 3, 22],
    ["independence-day", 6, 4],
    ["halloween", 9, 31],
    ["christmas", 11, 25],
  ];

  for (const [id, monthIndex, day] of fixedEvents) {
    const date = localDate(2026, monthIndex, day);
    const before = new Date(date);
    before.setDate(before.getDate() - 1);
    const after = new Date(date);
    after.setDate(after.getDate() + 1);

    assert.equal(getSpecialEventForDate(before), null, `${id} must not activate one day early`);
    assert.equal(getSpecialEventForDate(date)?.id, id);
    assert.equal(getSpecialEventForDate(after), null, `${id} must not activate one day late`);
  }
});

test("February 2 is an ordinary non-event date", () => {
  assert.equal(eventId(2026, 1, 2), null);
});

test("Easter activates on Easter Sunday and not adjacent dates", () => {
  for (const [year, monthIndex, day] of [
    [2026, 3, 5],
    [2027, 2, 28],
    [2028, 3, 16],
  ]) {
    assert.equal(eventId(year, monthIndex, day - 1), null);
    assert.equal(eventId(year, monthIndex, day), "easter");
    assert.equal(eventId(year, monthIndex, day + 1), null);
  }
});

test("US movable holidays are exact in 2026 and 2027", () => {
  const dates = [
    ["mothers-day", 2026, 4, 10],
    ["mothers-day", 2027, 4, 9],
    ["fathers-day", 2026, 5, 21],
    ["fathers-day", 2027, 5, 20],
    ["thanksgiving", 2026, 10, 26],
    ["thanksgiving", 2027, 10, 25],
  ];

  for (const [id, year, monthIndex, day] of dates) {
    assert.equal(eventId(year, monthIndex, day - 1), null, `${id} must not activate one day early in ${year}`);
    assert.equal(eventId(year, monthIndex, day), id);
    assert.equal(eventId(year, monthIndex, day + 1), null, `${id} must not activate one day late in ${year}`);
  }
});

test("New Year covers only December 31 and January 1 with date-specific greetings", () => {
  assert.equal(eventId(2026, 11, 30), null);

  const eve = getSpecialEventForDate(localDate(2026, 11, 31));
  assert.equal(eve.id, "new-year");
  assert.equal(eve.greeting, "Happy New Year’s Eve!");

  const day = getSpecialEventForDate(localDate(2027, 0, 1));
  assert.equal(day.id, "new-year");
  assert.equal(day.greeting, "Happy New Year!");

  assert.equal(eventId(2027, 0, 2), null);
});

test("Easter takes priority when it falls on Earth Day in 2057", () => {
  assert.deepEqual(parts(getEasterDate(2057)), [2057, 3, 22]);
  assert.equal(eventId(2057, 3, 21), null);
  assert.equal(eventId(2057, 3, 22), "easter");
  assert.equal(eventId(2057, 3, 23), null);
});

test("preview resolver accepts only auto, none, and supported IDs", () => {
  assert.equal(resolveEventPreview("auto"), "auto");
  assert.equal(resolveEventPreview("none"), "none");
  for (const id of expectedIds) assert.equal(resolveEventPreview(id), id);

  for (const invalid of [
    null,
    undefined,
    "",
    "christmas-day",
    "CHRISTMAS",
    " auto ",
    12,
    {},
  ]) {
    assert.equal(resolveEventPreview(invalid), "auto");
  }
});

test("date resolver rejects invalid inputs", () => {
  assert.throws(() => getSpecialEventForDate(new Date(Number.NaN)), TypeError);
  assert.throws(() => getSpecialEventForDate("2026-12-25"), TypeError);
});
