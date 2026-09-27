import React from 'react';

export default function Link({
  href,
  children,
  className,
  onClick,
  target,
  ...props
}: any) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!target || target === '_self') {
      if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} target={target} {...props}>
      {children}
    </a>
  );
}
