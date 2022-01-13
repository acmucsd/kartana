/**
 * This is a VERBATIM copy of the Logger used in BreadBot.
 * 
 * Make of that what you will.
 */
import {
  createLogger, transports as Transports, format,
} from 'winston';
import 'winston-daily-rotate-file';
import { DateTime } from 'luxon';
  
const {
  printf, combine, json, timestamp, colorize,
} = format;
  
/**
 * Formatting for the standard output transport.
 *
 * Ideally, we don't have to read JSON whilst reading stdout, so we'll make a readable format
 * with the timestamp, log level and message.
 */
const consoleLogFormat = printf((information) => {
  const currentTime = DateTime.now().setZone('America/Los_Angeles').toISO();
  return `[${currentTime}] [${information.level}]: ${information.message}`;
});
  
/**
 * Logger for the Notion Event Pipeline with split transports.
 *
 * Logger saves colorized output to standard out and creates a daily rotated log file
 * of the same logs for safekeeping purposes.
 * 
 * TODO Add Error Transport to send Discord webhook messages to the maintainer.
 */
export default createLogger({
  format: json(),
  transports: [
    new Transports.Console({
      level: 'debug',
      format: process.env.NODE_ENV === 'development'
        ? combine(colorize(), consoleLogFormat)
        : combine(timestamp(), json()),
    }),
    new Transports.DailyRotateFile({
      level: 'info',
      format: combine(timestamp(), json()),
      filename: 'logs/BreadBot-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});