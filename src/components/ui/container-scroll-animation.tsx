"use client";
import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

interface ContainerScrollProps {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  enable3DRotate?: boolean;
}

export const ContainerScroll: React.FC<ContainerScrollProps> = ({
  titleComponent,
  children,
  className = "",
  enable3DRotate = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.8, 0.95] : [1.02, 1];
  };

  // If enable3DRotate is true, tilts rotateX from 20deg to 0deg.
  // Otherwise stays flat (0deg) to avoid perspective distortion on 2D illustrations.
  const rotate = useTransform(scrollYProgress, [0, 1], enable3DRotate ? [20, 0] : [0, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <div
      className={`min-h-[50rem] md:min-h-[65rem] flex items-center justify-center relative p-2 md:p-8 ${className}`}
      ref={containerRef}
    >
      <div
        className="py-6 md:py-16 w-full relative"
        style={{
          perspective: enable3DRotate ? "1000px" : "none",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

interface HeaderProps {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ translate, titleComponent }) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

interface CardProps {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  rotate,
  scale,
  children,
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
      }}
      className="max-w-6xl -mt-6 sm:-mt-10 mx-auto w-full border-4 border-black p-3 sm:p-6 bg-white shadow-[8px_8px_0px_#111] sm:shadow-[14px_14px_0px_#111]"
    >
      <div className="h-full w-full overflow-hidden bg-transparent">
        {children}
      </div>
    </motion.div>
  );
};

export default ContainerScroll;
