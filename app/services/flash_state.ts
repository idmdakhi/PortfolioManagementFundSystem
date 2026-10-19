/**
 * Did the request that just ran end in a refusal? Controllers flash `error`; VineJS validation
 * failures are handled as a redirect (next() returns normally) and the session flashes
 * `errorsBag` (summary) and `inputErrorsBag` ({ field: [messages] }).
 */
export type Problem = 'rejected' | 'invalid' | null

export function flashProblem(session: { responseFlashMessages: { all: () => Record<string, unknown> } }): Problem {
  const keys = Object.keys(session.responseFlashMessages.all())
  if (keys.includes('inputErrorsBag') || keys.includes('errorsBag')) return 'invalid'
  if (keys.includes('error')) return 'rejected'
  return null
}
