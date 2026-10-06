import React, { useEffect, useRef, useState } from 'react';

interface StaggerProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  children: React.ReactNode;
}

/**
 * Children rise in one after another, once, when the group enters the viewport.
 * The motion lives in CSS (`[data-stagger]` in globals.css); this only flips one attribute.
 */
export const Stagger: React.FC<StaggerProps> = ({ as: Tag = 'div', children, ...rest }) => {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} data-stagger data-in={seen ? '1' : '0'} {...rest}>
      {children}
    </Tag>
  );
};

export default Stagger;
