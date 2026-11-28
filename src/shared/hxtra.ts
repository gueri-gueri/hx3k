// What a build of HXtra takes, as its setup page counts it (web/index.html): the
// DSP features share the room NAM A2 Lite's slots leave in the DSP's memory, and
// a feature or a slot count that would overflow it cannot be picked. Shared by
// the screen that offers the choice and the main process that builds it.

import type { DspTable, HxtraChoice, HxtraRelease } from './types'

/** The steps a build reports, as the setup page numbers them. */
export const BUILD_STEPS = 6

/** The slot count a choice builds: 0 without NAM A2 Lite. */
export function namSlots(choice: HxtraChoice): number {
  return choice.nam ? choice.slots : 0
}

export interface DspUse {
  /** The room with no NAM A2 Lite at all: the meter's whole length. */
  total: number
  /** What the NAM A2 Lite slots take: what Off would free. */
  nam: number
  /** What the DSP features turned on take. */
  used: number
  left: number
}

function room(dsp: DspTable, slots: number): number {
  return dsp.room[String(slots)] ?? 0
}

export function dspUse(dsp: DspTable, choice: HxtraChoice): DspUse {
  const total = Math.max(...dsp.slots.map((s) => room(dsp, s)))
  const nam = total - room(dsp, namSlots(choice))
  const used = choice.dsp.reduce((n, f) => n + (dsp.cost[f] ?? 0), 0)
  return { total, nam, used, left: total - nam - used }
}

/** The DSP features fit beside the slots picked. */
export function dspFits(dsp: DspTable, choice: HxtraChoice): boolean {
  return dsp.slots.includes(namSlots(choice)) && dspUse(dsp, choice).left >= 0
}

/** A DSP feature can be turned on: it is on, or what it takes is left. */
export function canTurnOn(dsp: DspTable, choice: HxtraChoice, feature: string): boolean {
  return choice.dsp.includes(feature) || (dsp.cost[feature] ?? Infinity) <= dspUse(dsp, choice).left
}

/** That many slots leave room for the DSP features turned on. */
export function slotsFit(dsp: DspTable, choice: HxtraChoice, slots: number): boolean {
  return dsp.slots.includes(slots) && room(dsp, slots) >= dspUse(dsp, choice).used
}

/** The slot counts the user picks from (NAM A2 Lite on), most first. */
export function slotChoices(dsp: DspTable): number[] {
  return dsp.slots.filter((s) => s > 0).sort((a, b) => b - a)
}

/**
 * NAM A2 Lite turned on or off. On, the slot count picked stays if it still fits
 * beside the DSP features; else the most that fit, as the setup page does.
 */
export function withNam(dsp: DspTable, choice: HxtraChoice, on: boolean): HxtraChoice {
  if (!on) return { ...choice, nam: false }
  if (slotsFit(dsp, choice, choice.slots)) return { ...choice, nam: true }
  const fit = slotChoices(dsp).find((s) => slotsFit(dsp, choice, s))
  return fit === undefined ? choice : { ...choice, nam: true, slots: fit }
}

/** NAM A2 Lite can be turned on: some slot count fits beside the DSP features. */
export function canTurnOnNam(dsp: DspTable, choice: HxtraChoice): boolean {
  return choice.nam || slotChoices(dsp).some((s) => slotsFit(dsp, choice, s))
}

/** A DSP feature or another feature turned on or off, kept in the release's order. */
export function withFeature(release: Pick<HxtraRelease, 'dsp' | 'options'>, choice: HxtraChoice, feature: string, on: boolean): HxtraChoice {
  const pick = (list: string[], order: string[]): string[] => {
    const set = new Set(list)
    if (on) set.add(feature)
    else set.delete(feature)
    return order.filter((f) => set.has(f))
  }
  if (release.dsp.features.includes(feature)) return { ...choice, dsp: pick(choice.dsp, release.dsp.features) }
  if (release.options.includes(feature)) return { ...choice, options: pick(choice.options, release.options) }
  return choice
}

/** A choice from anywhere (a saved file, the other process) made one the release can build, or null. */
export function cleanChoice(release: Pick<HxtraRelease, 'dsp' | 'options'>, raw: unknown): HxtraChoice | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Record<keyof HxtraChoice, unknown>>
  const list = (value: unknown, order: string[]): string[] => {
    const given = new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [])
    return order.filter((f) => given.has(f))
  }
  const slots = Number(r.slots)
  if (!slotChoices(release.dsp).includes(slots)) return null
  return { nam: r.nam === true, slots, dsp: list(r.dsp, release.dsp.features), options: list(r.options, release.options) }
}

/** The switches a build sets (build.py's environment): every build's features, then those picked. */
export function buildFlags(release: Pick<HxtraRelease, 'features' | 'options' | 'dsp'>, choice: HxtraChoice): string[] {
  return [
    ...release.features,
    ...release.options.filter((f) => choice.options.includes(f)),
    ...release.dsp.features.filter((f) => choice.dsp.includes(f)),
  ]
}

/** Where a release's m4cache.json keeps the MD5 HXtra tested for these switches. */
export function md5Key(flags: string[], slots: number): string {
  return [...flags, `HX_NAM_SLOTS=${slots}`].sort().join('+')
}

export function sameChoice(a: HxtraChoice, b: HxtraChoice): boolean {
  return namSlots(a) === namSlots(b) && a.dsp.join() === b.dsp.join() && a.options.join() === b.options.join()
}
