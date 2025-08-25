interface LoggerMethod {
  (object: object, message: string): unknown;
  (message: string): unknown;
}
export type Logger = {
  error: LoggerMethod;
  debug: LoggerMethod;
};
