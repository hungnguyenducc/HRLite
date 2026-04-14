import * as winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'hrlite-backend' },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, service: _service, ...rest }) => {
                  const metaStr =
                    Object.keys(rest).length > 0
                      ? ` ${JSON.stringify(rest)}`
                      : '';
                  return `${timestamp} [${level}]: ${message}${metaStr}`;
                },
              ),
            ),
    }),
  ],
});

export default logger;
