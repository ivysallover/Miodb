import { lazy, Suspense } from 'react';

export default function dynamic(importer: any, options?: any) {
  const LazyComponent = lazy(importer);

  return function DynamicWrapper(props: any) {
    return (
      <Suspense fallback={options?.loading ? options.loading() : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
