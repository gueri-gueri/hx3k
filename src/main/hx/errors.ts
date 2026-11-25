export type HxErrorCode =
  /** No HX Stomp is plugged in and running its normal firmware. */
  | 'not_found'
  /** Another program (HX Edit, Line 6 Updater) or a driver holds the unit's message interface. */
  | 'busy'
  /** The unit did not answer in time. */
  | 'timeout'
  /** The unit was unplugged or the session was closed. */
  | 'closed'
  /** The unit sent something this code does not understand. */
  | 'protocol'
  /** The unit answered a command with an error. */
  | 'refused'
  /** What was to be sent is not something the unit can take. */
  | 'invalid'

export class HxError extends Error {
  constructor(
    readonly code: HxErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'HxError'
  }
}
