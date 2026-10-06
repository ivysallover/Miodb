import { describe, it, expect } from 'vitest';

describe('Application Route Classification', () => {
  const landingPaths = ['/', '/hero-stage', '/nuevo-landing', '/landing-v2', '/stage'];
  const internalRoutes = ['/dashboard', '/admin', '/projects', '/login'];
  const legalRoutes = [
    '/terminos',
    '/privacidad',
    '/cookies',
    '/aviso-legal',
    '/dpa',
    '/arrepentimiento',
  ];
  const testPetRoutes = ['/test-pet', '/mio-pet'];

  function classifyRoute(path: string) {
    const isLanding = landingPaths.includes(path);
    const isLegal = legalRoutes.includes(path);
    const isInternal = internalRoutes.includes(path);
    const isTestPet = testPetRoutes.includes(path);
    const isNotFound = !isLanding && !isLegal && !isInternal && !isTestPet;

    return { isLanding, isLegal, isInternal, isTestPet, isNotFound };
  }

  it('classifies root as landing', () => {
    const res = classifyRoute('/');
    expect(res.isLanding).toBe(true);
    expect(res.isNotFound).toBe(false);
  });

  it('classifies internal routes', () => {
    internalRoutes.forEach((path) => {
      const res = classifyRoute(path);
      expect(res.isInternal).toBe(true);
      expect(res.isNotFound).toBe(false);
    });
  });

  it('classifies legal compliance routes', () => {
    legalRoutes.forEach((path) => {
      const res = classifyRoute(path);
      expect(res.isLegal).toBe(true);
      expect(res.isNotFound).toBe(false);
    });
  });

  it('classifies unknown coordinates as 404 NotFound', () => {
    const unknownPaths = [
      '/coordenada-invalida',
      '/asdf',
      '/admin/secret',
      '/api/unknown',
      '/page-does-not-exist',
    ];

    unknownPaths.forEach((path) => {
      const res = classifyRoute(path);
      expect(res.isNotFound).toBe(true);
      expect(res.isLanding).toBe(false);
    });
  });
});
