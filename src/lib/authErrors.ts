/** Qué decirle a la persona cuando falla el ingreso con Firebase (lo usan la web y la app de escritorio). */
export function authMessage(err: unknown): string {
  switch ((err as { code?: string })?.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'El mail o la contraseña no coinciden.';
    case 'auth/email-already-in-use':
      return 'Ese mail ya tiene cuenta. Entrá con tu contraseña.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'Ese mail no parece válido. Revisalo.';
    case 'auth/account-exists-with-different-credential':
      return 'Ese mail ya tiene cuenta con otra forma de ingreso. Entrá como la creaste.';
    case 'auth/too-many-requests':
      return 'Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.';
    case 'auth/network-request-failed':
      return 'No hay conexión. Revisá tu internet y probá de nuevo.';
    default:
      return 'No pudimos ingresar. Probá de nuevo en un momento.';
  }
}
