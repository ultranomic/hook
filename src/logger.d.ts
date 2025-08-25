interface LoggerMethod {
  (object: unknown, message: string): unknown;
  (message: string): unknown;
}
export type Logger = {
  error: LoggerMethod;
  debug: LoggerMethod;
};
