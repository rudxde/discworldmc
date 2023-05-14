export class ServerStartLimitError extends Error {
  constructor() {
    super('Server start limit is reached');
  }
}
