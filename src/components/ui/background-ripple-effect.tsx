"use client";
import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { playMioDevSound } from "@/lib/sound";

export const BackgroundRippleEffect = ({
  rows = 8,
  cols = 28,
  cellSize = 56,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
}) => {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const lastDragTime = useRef(0);

  const handleCellTrigger = (row: number, col: number, isClick: boolean) => {
    if (isClick) {
      playMioDevSound('select');
    } else {
      const now = performance.now();
      if (now - lastDragTime.current < 90) return;
      lastDragTime.current = now;
      playMioDevSound('tick');
    }
    setClickedCell({ row, col });
    setRippleKey((k) => k + 1);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:#1e1534] [--cell-fill-color:#090614] [--cell-shadow-color:#150f28]"
      )}
    >
      <div className="relative h-auto w-auto overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden" />
        <DivGrid
          key={`base-${rippleKey}`}
          className="mask-radial-from-20% mask-radial-at-top"
          rows={rows}
          cols={cols}
          cellSize={cellSize}
          borderColor="#1f1638"
          fillColor="#0c0818"
          clickedCell={clickedCell}
          onCellClick={(row, col) => handleCellTrigger(row, col, true)}
          onCellHover={(row, col) => handleCellTrigger(row, col, false)}
          interactive
        />
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number;
  borderColor: string;
  fillColor: string;
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  ["--delay"]?: string;
  ["--duration"]?: string;
};

const DivGrid = ({
  className,
  rows = 8,
  cols = 28,
  cellSize = 56,
  borderColor = "#1f1638",
  fillColor = "#0c0818",
  clickedCell = null,
  onCellClick = () => {},
  onCellHover = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols],
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    width: "100%",
    maxWidth: `${cols * cellSize}px`,
    aspectRatio: `${cols} / ${rows}`,
    marginInline: "auto",
  };

  return (
    <div className={cn("relative z-[3]", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 48) : 0; // ms
        const duration = 240 + distance * 65; // ms
        const isLimeWave = (rowIdx + colIdx) % 2 === 0;

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] opacity-40 transition-all duration-200 will-change-transform hover:opacity-100 hover:scale-105 cursor-pointer",
              clickedCell &&
                (isLimeWave
                  ? "animate-cell-ripple-lime [animation-fill-mode:none]"
                  : "animate-cell-ripple-violet [animation-fill-mode:none]"),
              !interactive && "pointer-events-none",
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
              ...style,
            }}
            onClick={interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined}
            onPointerEnter={interactive ? () => onCellHover?.(rowIdx, colIdx) : undefined}
          />
        );
      })}
    </div>
  );
};
