const rawEvents = [
  {
    id: "new-year",
    label: "New Year",
    previewLabel: "New Year’s Eve & New Year’s Day",
    greetings: {
      eve: "Happy New Year’s Eve!",
      day: "Happy New Year!",
      default: "Happy New Year!",
    },
    modulePath: "./scenes/new-year.mjs",
  },
  {
    id: "valentines-day",
    label: "Valentine’s Day",
    previewLabel: "Valentine’s Day",
    greetings: { default: "Happy Valentine’s Day!" },
    modulePath: "./scenes/valentines-day.mjs",
  },
  {
    id: "st-patricks-day",
    label: "St. Patrick’s Day",
    previewLabel: "St. Patrick’s Day",
    greetings: { default: "Happy St. Patrick’s Day!" },
    modulePath: "./scenes/st-patricks-day.mjs",
  },
  {
    id: "easter",
    label: "Easter",
    previewLabel: "Easter",
    greetings: { default: "Happy Easter!" },
    modulePath: "./scenes/easter.mjs",
  },
  {
    id: "earth-day",
    label: "Earth Day",
    previewLabel: "Earth Day",
    greetings: { default: "Happy Earth Day!" },
    modulePath: "./scenes/earth-day.mjs",
  },
  {
    id: "mothers-day",
    label: "Mother’s Day",
    previewLabel: "Mother’s Day",
    greetings: { default: "Happy Mother’s Day!" },
    modulePath: "./scenes/mothers-day.mjs",
  },
  {
    id: "fathers-day",
    label: "Father’s Day",
    previewLabel: "Father’s Day",
    greetings: { default: "Happy Father’s Day!" },
    modulePath: "./scenes/fathers-day.mjs",
  },
  {
    id: "independence-day",
    label: "Fourth of July",
    previewLabel: "Fourth of July",
    greetings: { default: "Happy Fourth of July!" },
    modulePath: "./scenes/independence-day.mjs",
  },
  {
    id: "halloween",
    label: "Halloween",
    previewLabel: "Halloween",
    greetings: { default: "Happy Halloween!" },
    modulePath: "./scenes/halloween.mjs",
  },
  {
    id: "thanksgiving",
    label: "Thanksgiving",
    previewLabel: "Thanksgiving",
    greetings: { default: "Happy Thanksgiving!" },
    modulePath: "./scenes/thanksgiving.mjs",
  },
  {
    id: "christmas",
    label: "Christmas",
    previewLabel: "Christmas",
    greetings: { default: "Merry Christmas!" },
    modulePath: "./scenes/christmas.mjs",
  },
];

export const SEASONAL_EVENTS = Object.freeze(
  rawEvents.map((event) =>
    Object.freeze({
      ...event,
      greetings: Object.freeze({ ...event.greetings }),
    }),
  ),
);

export const SEASONAL_EVENT_IDS = Object.freeze(SEASONAL_EVENTS.map(({ id }) => id));

export const SEASONAL_EVENT_BY_ID = Object.freeze(
  Object.fromEntries(SEASONAL_EVENTS.map((event) => [event.id, event])),
);

const validEventIds = new Set(SEASONAL_EVENT_IDS);

/**
 * Returns the requested weekday occurrence as a visitor-local Date.
 *
 * @param {number} year Full Gregorian year.
 * @param {number} monthIndex JavaScript month index (January is 0).
 * @param {number} weekday JavaScript weekday (Sunday is 0).
 * @param {number} occurrence One-based occurrence within the month.
 * @returns {Date|null} Null when that occurrence does not exist in the month.
 */
export function nthWeekdayOfMonth(year, monthIndex, weekday, occurrence) {
  if (!Number.isInteger(year)) throw new TypeError("year must be an integer");
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new RangeError("monthIndex must be between 0 and 11");
  }
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new RangeError("weekday must be between 0 and 6");
  }
  if (!Number.isInteger(occurrence) || occurrence < 1 || occurrence > 5) {
    throw new RangeError("occurrence must be between 1 and 5");
  }

  const firstOfMonth = new Date(year, monthIndex, 1);
  const offset = (weekday - firstOfMonth.getDay() + 7) % 7;
  const dayOfMonth = 1 + offset + (occurrence - 1) * 7;
  const result = new Date(year, monthIndex, dayOfMonth);
  return result.getMonth() === monthIndex ? result : null;
}

/**
 * Calculates Western Easter Sunday in the Gregorian calendar.
 *
 * @param {number} year Full Gregorian year (1583 or later).
 * @returns {Date} A visitor-local Date at local midnight.
 */
export function getEasterDate(year) {
  if (!Number.isInteger(year) || year < 1583) {
    throw new RangeError("year must be a Gregorian calendar year (1583 or later)");
  }

  const goldenYear = year % 19;
  const century = Math.floor(year / 100);
  const yearInCentury = year % 100;
  const leapCentury = Math.floor(century / 4);
  const centuryRemainder = century % 4;
  const correction = Math.floor((century + 8) / 25);
  const moonCorrection = Math.floor((century - correction + 1) / 3);
  const epact = (19 * goldenYear + century - leapCentury - moonCorrection + 15) % 30;
  const leapYears = Math.floor(yearInCentury / 4);
  const yearRemainder = yearInCentury % 4;
  const weekdayCorrection = (32 + 2 * centuryRemainder + 2 * leapYears - epact - yearRemainder) % 7;
  const finalCorrection = Math.floor((goldenYear + 11 * epact + 22 * weekdayCorrection) / 451);
  const month = Math.floor((epact + weekdayCorrection - 7 * finalCorrection + 114) / 31);
  const day = ((epact + weekdayCorrection - 7 * finalCorrection + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function isSameLocalDate(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function eventSnapshot(id, date) {
  const config = SEASONAL_EVENT_BY_ID[id];
  const greeting =
    id === "new-year"
      ? date.getMonth() === 11
        ? config.greetings.eve
        : config.greetings.day
      : config.greetings.default;

  return Object.freeze({ ...config, greeting });
}

/**
 * Resolves the special occasion for the visitor's local calendar date.
 *
 * @param {Date} date Date whose local year, month, and day should be checked.
 * @returns {(typeof SEASONAL_EVENTS)[number] & {greeting: string}|null}
 */
export function getSpecialEventForDate(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("date must be a valid Date");
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if ((month === 11 && day === 31) || (month === 0 && day === 1)) {
    return eventSnapshot("new-year", date);
  }
  if (month === 1 && day === 14) return eventSnapshot("valentines-day", date);
  if (month === 2 && day === 17) return eventSnapshot("st-patricks-day", date);

  // Easter is checked before every April fixed date so it wins the rare
  // Easter/Earth Day collision (for example, April 22, 2057).
  if (isSameLocalDate(date, getEasterDate(year))) return eventSnapshot("easter", date);
  if (month === 3 && day === 22) return eventSnapshot("earth-day", date);

  const mothersDay = nthWeekdayOfMonth(year, 4, 0, 2);
  if (mothersDay && isSameLocalDate(date, mothersDay)) return eventSnapshot("mothers-day", date);

  const fathersDay = nthWeekdayOfMonth(year, 5, 0, 3);
  if (fathersDay && isSameLocalDate(date, fathersDay)) return eventSnapshot("fathers-day", date);

  if (month === 6 && day === 4) return eventSnapshot("independence-day", date);
  if (month === 9 && day === 31) return eventSnapshot("halloween", date);

  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);
  if (thanksgiving && isSameLocalDate(date, thanksgiving)) return eventSnapshot("thanksgiving", date);

  if (month === 11 && day === 25) return eventSnapshot("christmas", date);
  return null;
}

/**
 * Normalizes an event-preview query value.
 *
 * @param {unknown} value Raw event-preview query parameter.
 * @returns {"auto"|"none"|string} Automatic mode, no event, or a valid event ID.
 */
export function resolveEventPreview(value) {
  return value === "auto" || value === "none" || validEventIds.has(value) ? value : "auto";
}
