export class NanaError extends Error {
  constructor(status: number, description?: string) {
    super(description)
    Object.setPrototypeOf(this, NanaError.prototype)
    this.status = status
    this.message = description || 'Unknown NanaError'
  }

  status: number
}
