import React from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { useAccount } from '@/utils/useAccount';
import { TermsAcceptance } from './TermsAcceptance';

const navigateTo = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/**
 * En las páginas de la cuenta (dashboard, proyectos, admin): si quien ingresó no aceptó los términos
 * vigentes (por ejemplo, entró con Google, donde no se piden), se los pide antes de seguir.
 */
export const TermsGate: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const { account, accept, accepting, error, leave } = useAccount('web');
  if (account.kind !== 'terminos') return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="terminos-titulo" className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b0914]/70 p-4 backdrop-blur-sm sm:p-8">
      <TermsAcceptance isDark={isDark} email={account.user.email} accepting={accepting} error={error} onAccept={accept} onLeave={leave} onNavigate={navigateTo} />
    </div>
  );
};

export default TermsGate;
