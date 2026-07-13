import { useMemo } from 'react';
import { type Exam } from '../../db';

interface ExamChartProps {
  exams: Exam[];
  targetNet: number;
}

export default function ExamChart({ exams, targetNet }: ExamChartProps) {
  // Sort exams chronologically
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
  }, [exams]);

  const chartData = useMemo(() => {
    if (sortedExams.length === 0) return [];
    return sortedExams.map((exam, idx) => ({
      index: idx,
      name: exam.ad,
      net: exam.toplamNet,
      date: new Date(exam.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    }));
  }, [sortedExams]);

  // Dimension helpers
  const width = 600;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Scales
  const maxNet = 120;
  const minNet = 0;

  const getX = (index: number) => {
    if (chartData.length <= 1) {
      return paddingLeft + chartWidth / 2;
    }
    return paddingLeft + (index / (chartData.length - 1)) * chartWidth;
  };

  const getY = (net: number) => {
    const ratio = (net - minNet) / (maxNet - minNet);
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  const targetY = getY(targetNet);

  // Build line path
  const linePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.index)} ${getY(d.net)}`).join(' ');
  }, [chartData]);

  if (exams.length === 0) {
    return (
      <div className="kp-chart-placeholder">
        Grafik çizilebilmesi için en az bir deneme sınavı girilmelidir.
      </div>
    );
  }

  return (
    <div className="kp-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="kp-svg-chart">
        {/* Grid Lines */}
        {[0, 20, 40, 60, 80, 100, 120].map(val => {
          const y = getY(val);
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--line)"
                strokeDasharray="2,2"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="kp-chart-grid-lbl"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Target Net Line (Dashed Red Stamp) */}
        <line
          x1={paddingLeft}
          y1={targetY}
          x2={width - paddingRight}
          y2={targetY}
          stroke="var(--stamp)"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />
        <text
          x={width - paddingRight + 6}
          y={targetY + 4}
          className="kp-chart-target-lbl"
          textAnchor="start"
        >
          HEDEF {targetNet}
        </text>

        {/* Exam Line Path */}
        {chartData.length > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--dosya)"
            strokeWidth="2"
          />
        )}

        {/* Node Points & Value Labels */}
        {chartData.map((d) => {
          const cx = getX(d.index);
          const cy = getY(d.net);
          return (
            <g key={d.index}>
              {/* Highlight point */}
              <circle
                cx={cx}
                cy={cy}
                r="4"
                fill="var(--paper)"
                stroke="var(--dosya)"
                strokeWidth="2"
              />
              {/* Value label */}
              <text
                x={cx}
                y={cy - 10}
                className="kp-chart-val-lbl"
                textAnchor="middle"
              >
                {d.net}
              </text>
              {/* X axis Date label */}
              <text
                x={cx}
                y={height - paddingBottom + 16}
                className="kp-chart-axis-lbl"
                textAnchor="middle"
              >
                {d.date}
              </text>
              {/* X axis Short Name label */}
              <text
                x={cx}
                y={height - paddingBottom + 28}
                className="kp-chart-axis-sublbl"
                textAnchor="middle"
              >
                {d.name.length > 8 ? `${d.name.slice(0, 7)}...` : d.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
