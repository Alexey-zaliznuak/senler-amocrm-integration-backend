export type TimeOptions = {
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
  weeks?: number;
  months?: number;
  years?: number;
};

const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_MINUTE = MILLISECONDS_PER_SECOND * 60;
const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * 60;
const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * 24;
const MILLISECONDS_PER_WEEK = MILLISECONDS_PER_DAY * 7;
const MILLISECONDS_PER_MONTH = MILLISECONDS_PER_DAY * 30.44;
const MILLISECONDS_PER_YEAR = MILLISECONDS_PER_DAY * 365.25;

export function timeToMilliseconds(options: TimeOptions): number {
  const { seconds = 0, minutes = 0, hours = 0, days = 0, weeks = 0, months = 0, years = 0 } = options;

  return (
    seconds * MILLISECONDS_PER_SECOND +
    minutes * MILLISECONDS_PER_MINUTE +
    hours * MILLISECONDS_PER_HOUR +
    days * MILLISECONDS_PER_DAY +
    weeks * MILLISECONDS_PER_WEEK +
    months * MILLISECONDS_PER_MONTH +
    years * MILLISECONDS_PER_YEAR
  );
}
