import React from 'react';
import { Mio, MioProps, MioState, MioMaterialVariant } from './Mio';
import { MioPetMood, MioPetMaterial } from './MioPet2D';

export interface MioPet3DProps {
  mood?: MioPetMood;
  material?: MioPetMaterial;
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  floatAnimation?: boolean;
  modelSource?: 'glb' | 'procedural';
  enableBloom?: boolean;
  showFloor?: boolean;
  onLoaded?: () => void;
}

/**
 * MioPet3D bridge adapter component for backwards compatibility.
 * Delegates rendering directly to the master <Mio /> component.
 */
export const MioPet3D: React.FC<MioPet3DProps> = ({
  mood = 'reposo',
  material = 'violet',
  className = '',
  autoRotate = false,
  interactive = true,
  enableBloom = true,
  showFloor = true,
  onLoaded,
}) => {
  const stateMap: Record<MioPetMood, MioState> = {
    reposo: 'reposo',
    trabajando: 'trabajando',
    celebrando: 'celebrando',
    anomalia: 'anomalia',
    durmiendo: 'durmiendo',
  };

  const materialMap: Record<MioPetMaterial, MioMaterialVariant> = {
    violet: 'violeta',
    titanium: 'titanio',
    blackChrome: 'cromo_negro',
  };

  return (
    <Mio
      state={stateMap[mood] || 'reposo'}
      material={materialMap[material] || 'violeta'}
      className={className}
      autoRotate={autoRotate}
      interactive={interactive}
      enableBloom={enableBloom}
      showFloor={showFloor}
      onLoaded={onLoaded}
    />
  );
};

export { Mio };
export type { MioProps, MioState, MioMaterialVariant };
