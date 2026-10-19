/**
 * Serialises every state-changing request (docs/DECISIONS.md D-05).
 *
 * Controllers do "load state -> validate -> write". Between those awaits another request could
 * change the state, so two redeems that are each valid alone could together drive units negative.
 * One process + SQLite means a single in-process queue is a complete fix.
 */
let tail: Promise<unknown> = Promise.resolve()

export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn)
  tail = run.then(
    () => undefined,
    () => undefined
  )
  return run
}
