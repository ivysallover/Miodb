import { describe, it, expect } from 'vitest';
import { PET_STATE_META, getPetGlbPath, type PetState, type PetMaterial } from '../components/pet/petKit';

describe('petKit Telemetry and Models', () => {
  const states: PetState[] = ['reposo', 'trabajando', 'celebrando', 'anomalia', 'durmiendo'];

  it('defines metadata for all 5 official pet states', () => {
    states.forEach((state) => {
      const meta = PET_STATE_META[state];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe('string');
      expect(typeof meta.color).toBe('string');
      expect(typeof meta.sigma).toBe('string');
      expect(typeof meta.eyes).toBe('string');
    });
  });

  it('resolves correct glb model paths for default and custom materials', () => {
    expect(getPetGlbPath('reposo', 'violeta')).toBe('/models/mio_reposo.glb');
    expect(getPetGlbPath('reposo', 'titanio')).toBe('/models/mio_reposo_titanio.glb');
    expect(getPetGlbPath('reposo', 'cromo_negro')).toBe('/models/mio_reposo_cromo_negro.glb');
    expect(getPetGlbPath('trabajando', 'violeta')).toBe('/models/mio_trabajando.glb');
    expect(getPetGlbPath('celebrando', 'violeta')).toBe('/models/mio_celebrando.glb');
    expect(getPetGlbPath('anomalia', 'violeta')).toBe('/models/mio_anomalia.glb');
    expect(getPetGlbPath('durmiendo', 'violeta')).toBe('/models/mio_durmiendo.glb');
  });
});
