/**
 * Money is stored as an INTEGER number of rials (no decimals, no floats).
 * Fund units are stored as an INTEGER number of micro-units (1 unit = 1_000_000 micro).
 * Floating point is only used transiently inside Decimal.js calculations.
 */
export const UNIT_SCALE = 1_000_000

export function toMicro(units: number): number {
  if (!Number.isFinite(units)) throw new RangeError('units must be finite')
  return Math.round(units * UNIT_SCALE)
}

export function fromMicro(micro: number): number {
  return micro / UNIT_SCALE
}

export function toRial(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('amount must be finite')
  return Math.round(value)
}
