import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getIsSoundMuted, toggleSoundMute, subscribeMuteState, playMioDevSound } from '@/lib/sound';
import { useMioStore } from '@/utils/useMioStore';

interface MioAudioToggleProps {
  className?: string;
  variant?: 'minimal' | 'full';
}

export const MioAudioToggle: React.FC<MioAudioToggleProps> = ({
  className = '',
  variant = 'minimal',
}) => {
  const [isMuted, setIsMuted] = useState(getIsSoundMuted());
  const isDark = useMioStore((s) => s.theme) === 'dark';

  useEffect(() => {
    return subscribeMuteState((muted) => setIsMuted(muted));
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = toggleSoundMute();
    if (!nextMuted) {
      playMioDevSound('select');
    }
  };

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        data-target-lock="true"
        title={isMuted ? 'Activar sonido Web Audio' : 'Silenciar sonido Web Audio'}
        aria-label={isMuted ? 'Activar sonido Web Audio' : 'Silenciar sonido Web Audio'}
        className={`p-2 rounded-none border transition-colors flex items-center justify-center cursor-pointer ${
          isMuted
            ? isDark
              ? 'border-white/10 text-zinc-500 hover:text-white bg-white/5'
              : 'border-black/10 text-zinc-400 hover:text-black bg-black/5'
            : isDark
            ? 'border-[#bdf559]/40 text-[#bdf559] bg-[#bdf559]/10'
            : 'border-[#7647eb]/40 text-[#7647eb] bg-[#7647eb]/10'
        } ${className}`}
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      data-target-lock="true"
      title={isMuted ? 'Activar sonido Web Audio' : 'Silenciar sonido Web Audio'}
      className={`px-3 py-1.5 rounded-none border font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
        isMuted
          ? isDark
            ? 'border-white/10 text-zinc-500 bg-white/5'
            : 'border-black/10 text-zinc-500 bg-black/5'
          : isDark
          ? 'border-[#bdf559]/40 text-[#bdf559] bg-[#bdf559]/10 shadow-[0_0_12px_rgba(189,245,89,0.15)]'
          : 'border-[#7647eb]/40 text-[#7647eb] bg-[#7647eb]/10'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isMuted ? 'bg-zinc-500' : 'bg-[#bdf559] animate-pulse shadow-[0_0_6px_#bdf559]'
        }`}
      />
      {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      <span>{isMuted ? 'AUDIO: OFF' : 'AUDIO: ON'}</span>
    </button>
  );
};

export default MioAudioToggle;
