// Fixed-date test baselines (spec v0.11.3; user ruling 2026-10-22).
//
// The production defaultCall() stamps the call date from the clock
// (core/src/defaults.ts, untouched). The Gavle winter surcharge reads that
// date, so every pinned baseline that derives from defaultCall() would turn
// red from 1 December. The suites therefore anchor the clock: calendar
// "today" is FIXED_TEST_DATE for every test process, the date the pinned
// figures were proven at.
//
// The anchor is an offset clock, not a frozen one: Date.now() and the
// zero-argument Date constructor return real elapsed time shifted so that
// the calendar date is the fixed date; arguments, timers and elapsed-time
// measurements are untouched. The fixed instant is midday UTC, so the date
// holds for any test run shorter than twelve hours.
//
// FIXED_TEST_DATE lies inside the 2026 tariff validity and outside every
// date window in the data (the Gavle winter window, 1 December to 30 April).
// The web suites carry the same constant in web/src/fixedClock.ts; a pin
// asserts the two agree.
export const FIXED_TEST_DATE = '2026-06-15';

const FIXED_INSTANT = Date.parse(`${FIXED_TEST_DATE}T12:00:00Z`);
const RealDate = Date;
const offset = FIXED_INSTANT - RealDate.now();
const offsetNow = () => RealDate.now() + offset;

const FixedClockDate = new Proxy(RealDate, {
  construct(target, args: unknown[]) {
    return args.length === 0
      ? new target(offsetNow())
      : Reflect.construct(target, args);
  },
  get(target, prop, receiver) {
    if (prop === 'now') return offsetNow;
    return Reflect.get(target, prop, receiver);
  }
});

(globalThis as { Date: DateConstructor }).Date = FixedClockDate as DateConstructor;
