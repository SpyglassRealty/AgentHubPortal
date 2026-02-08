import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ForecastGaugeProps {
  value: number; // e.g., -5.8 for -5.8%
  label: string; // e.g., "Home Price Forecast"
  description?: string;
  min?: number;
  max?: number;
}

export default function ForecastGauge({
  value,
  label,
  description,
  min = -20,
  max = 20,
}: ForecastGaugeProps) {
  // Clamp value to min/max
  const clampedValue = Math.max(min, Math.min(max, value));

  // Map value to angle (0 = left = -20%, 180 = right = +20%)
  const normalizedValue = (clampedValue - min) / (max - min);
  const angle = normalizedValue * 180;

  // SVG arc parameters
  const cx = 150;
  const cy = 130;
  const radius = 100;

  // Create gradient arc path
  const startAngle = Math.PI; // 180 degrees (left)
  const endAngle = 0; // 0 degrees (right)

  // Needle endpoint calculation
  const needleAngle = Math.PI - (angle * Math.PI) / 180;
  const needleX = cx + (radius - 10) * Math.cos(needleAngle);
  const needleY = cy - (radius - 10) * Math.sin(needleAngle);

  // Direction label
  const direction =
    value < -1 ? "Price Down ↘" : value > 1 ? "Price Up ↗" : "Stable →";
  const directionColor =
    value < -1 ? "#3b82f6" : value > 1 ? "#ef4444" : "#6b7280";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 160" className="w-full max-w-[280px]">
        <defs>
          {/* Gradient from blue (left/negative) to red (right/positive) */}
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#a3a3a3" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          {/* Shadow filter */}
          <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background arc (gray) */}
        <path
          d={describeArc(cx, cy, radius, 180, 0)}
          fill="none"
          stroke="currentColor"
          strokeWidth="18"
          className="text-muted/20"
          strokeLinecap="round"
        />

        {/* Colored gradient arc */}
        <path
          d={describeArc(cx, cy, radius, 180, 0)}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          opacity={0.85}
        />

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const tickAngle = Math.PI - pct * Math.PI;
          const innerR = radius - 28;
          const outerR = radius - 22;
          const x1 = cx + innerR * Math.cos(tickAngle);
          const y1 = cy - innerR * Math.sin(tickAngle);
          const x2 = cx + outerR * Math.cos(tickAngle);
          const y2 = cy - outerR * Math.sin(tickAngle);
          return (
            <line
              key={pct}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              className="text-muted-foreground/30"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Tick labels */}
        <text x="30" y={cy + 18} className="fill-muted-foreground text-[10px]" textAnchor="middle">
          {min}%
        </text>
        <text x={cx} y={cy - radius - 8} className="fill-muted-foreground text-[10px]" textAnchor="middle">
          0%
        </text>
        <text x="270" y={cy + 18} className="fill-muted-foreground text-[10px]" textAnchor="middle">
          +{max}%
        </text>

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="currentColor"
          className="text-foreground"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#needleShadow)"
        />

        {/* Needle center dot */}
        <circle cx={cx} cy={cy} r="6" className="fill-foreground" />
        <circle cx={cx} cy={cy} r="3" className="fill-background" />

        {/* Center value */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          className="fill-foreground font-bold text-[28px]"
          style={{ fontFamily: "system-ui" }}
        >
          {value >= 0 ? "+" : ""}
          {value.toFixed(1)}%
        </text>
      </svg>

      {/* Label */}
      <div className="flex items-center gap-1.5 -mt-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Direction sub-label */}
      <span
        className="text-xs font-medium mt-0.5"
        style={{ color: directionColor }}
      >
        {direction}
      </span>
    </div>
  );
}

// Helper: describe an SVG arc path
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy - radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy - radius * Math.sin(endRad);

  const largeArc = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}
