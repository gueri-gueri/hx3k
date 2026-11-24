import { describe, expect, it } from 'vitest'
import { modelFit, sortModels, toneFit } from '../src/shared/compat'
import { cleanName, modelBaseName, numbered, wavFileName } from '../src/shared/names'

describe('file names', () => {
  it("names a capture as HXtra's page does", () => {
    expect(wavFileName('JCM800 Crunch.nam')).toBe('JCM800 Crunch NAM.wav')
    expect(wavFileName('JCM800 Crunch.NAM')).toBe('JCM800 Crunch NAM.wav')
  })

  it('replaces what a file system refuses', () => {
    expect(cleanName('AC/DC: "Lead" <1>?')).toBe('AC_DC_ _Lead_ _1_')
    expect(cleanName('  ..  ')).toBe('capture')
    expect(cleanName('tab\there')).toBe('tab here')
    expect(wavFileName('a/b\\c')).toBe('a_b_c NAM.wav')
  })

  it('cuts a very long name', () => {
    const name = wavFileName('x'.repeat(300))
    expect(name).toBe(`${'x'.repeat(80)} NAM.wav`)
  })

  it("puts the tone's title before a model name that lacks it", () => {
    expect(modelBaseName('Plexi Lead 100', 'Gain 7 - SM57')).toBe('Plexi Lead 100 - Gain 7 - SM57')
    expect(modelBaseName('Plexi Lead 100', 'plexi lead 100 gain 7')).toBe('plexi lead 100 gain 7')
    expect(modelBaseName('Plexi Lead 100', '')).toBe('Plexi Lead 100')
    expect(modelBaseName('', 'Gain 7.nam')).toBe('Gain 7')
  })

  it('numbers a second file of the same name', () => {
    expect(numbered('Amp NAM.wav', 2)).toBe('Amp NAM (2).wav')
  })
})

describe('what the HX Stomp can play', () => {
  it('rates a model by architecture: every A2 file carries the A2 Lite model', () => {
    expect(modelFit({ architecture_version: '2' })).toBe('ready')
    expect(modelFit({ architecture_version: '1' })).toBe('no')
    expect(modelFit({ architecture_version: null })).toBe('no')
  })

  it('rates a tone from its list entry', () => {
    expect(toneFit({ format: 'nam', a2_models_count: 3 })).toBe('ready')
    expect(toneFit({ format: 'nam', a2_models_count: 0 })).toBe('no')
    expect(toneFit({ format: 'ir', a2_models_count: 0 })).toBe('no')
  })

  it('offers the A2 Lite models first, otherwise in the given order', () => {
    const models = [
      { id: 1, architecture_version: '2' as const, size: 'standard' as const },
      { id: 2, architecture_version: '2' as const, size: 'lite' as const },
      { id: 3, architecture_version: '1' as const, size: 'lite' as const },
      { id: 4, architecture_version: '2' as const, size: 'lite' as const },
    ]
    expect(sortModels(models).map((m) => m.id)).toEqual([2, 4, 1, 3])
  })
})
