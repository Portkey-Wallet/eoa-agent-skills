/**
 * CLI output helpers — standardized JSON output for AI tool consumption.
 */

export function outputSuccess(data: any): void {
  console.log(JSON.stringify({ status: 'success', data }, null, 2));
}

export function outputError(message: string): void {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}
