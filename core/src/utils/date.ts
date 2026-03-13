import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Hours added to UTC before truncating to midnight to define the "game day" boundary.
 * With 3, the game day rolls over at 21:00 UTC (= 18:00 Argentina, UTC-3).
 */
export const GAME_DAY_OFFSET_HOURS = 3;

/**
 * Returns the current game day as a dayjs object (start-of-day in UTC).
 * At 21:00 UTC this already returns *tomorrow's* UTC date, so the daily
 * reset effectively happens at 18:00 Argentina time.
 */
export const getGameDay = () => dayjs.utc().add(GAME_DAY_OFFSET_HOURS, 'hour').startOf('day');

/** Shortcut: start of the next game day. */
export const getGameTomorrow = () => getGameDay().add(1, 'day');

export const getCurrentUTCDateString = () => dayjs.utc().format('YYYY-MM-DD');
