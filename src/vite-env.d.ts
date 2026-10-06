/// <reference types="vite/client" />

declare module '*.glsl' {
  const src: string;
  export default src;
}

declare module '*.glsl?raw' {
  const src: string;
  export default src;
}

declare module '*.vert.glsl?raw' {
  const src: string;
  export default src;
}

declare module '*.frag.glsl?raw' {
  const src: string;
  export default src;
}

declare module 'next/link' {
  import * as React from 'react';
  export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
  }
  const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export default Link;
}

declare module 'next/dynamic' {
  import * as React from 'react';
  export type DynamicOptionsLoadingProps = {
    error?: Error | null;
    isLoading?: boolean;
    pastDelay?: boolean;
    retry?: () => void;
    timedOut?: boolean;
  };
  export default function dynamic<P = any>(
    dynamicOptions: any,
    options?: any
  ): React.ComponentType<P>;
}
