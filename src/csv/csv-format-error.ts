export class CsvFormatError extends Error {
  constructor(
    message: string,
    readonly line?: number,
  ) {
    super(line === undefined ? message : `Line ${String(line)}: ${message}`);
    this.name = 'CsvFormatError';
  }
}
