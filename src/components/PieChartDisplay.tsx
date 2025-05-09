import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PayslipItem } from "../utils/parser";

interface PieChartDisplayProps {
  items: PayslipItem[];
}

const COLORS = [
  "#d62728",
  "#ff7f0e",
  "#bcbd22",
  "#2ca02c",
  "#1f77b4",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#17becf",
];

const PieChartDisplay: React.FC<PieChartDisplayProps> = ({ items }) => {
  const chartData = items.filter(
    (item) =>
      item.amount > 0 &&
      !item.category.toLowerCase().includes("gross") &&
      !item.category.toLowerCase().includes("net") &&
      !item.category.toLowerCase().includes("taxable")
  );

  const totalDeductions = chartData.reduce((sum, item) => sum + item.amount, 0);

  if (chartData.length === 0) {
    return (
      <p className="placeholder-text">
        No deduction data found to display in the chart.
      </p>
    );
  }

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
    const percentageValue = (percent * 100).toFixed(0);

    if (parseFloat(percentageValue) < 5) {
      return null;
    }

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${percentageValue}%`}
      </text>
    );
  };

  const formatLegendValue = (value: string, entry: any) => {
    const { payload } = entry;
    const percentage =
      totalDeductions > 0
        ? ((payload.amount / totalDeductions) * 100).toFixed(1)
        : "0";
    const formattedAmount = payload.amount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    });
    return (
      <span style={{ color: "#333" }}>
        {" "}
        {/* Inline style for legend text color is fine here if specific */}
        {payload.category}: {formattedAmount} ({percentage}%)
      </span>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage =
        totalDeductions > 0
          ? ((data.amount / totalDeductions) * 100).toFixed(1)
          : "0";
      const formattedAmount = data.amount.toLocaleString("de-DE", {
        style: "currency",
        currency: "EUR",
      });
      return (
        // Tooltip is styled via .recharts-default-tooltip in CSS
        <div>
          <p className="recharts-tooltip-label">{`${data.category}`}</p>
          <p className="recharts-tooltip-item">{`Amount: ${formattedAmount}`}</p>
          <p className="recharts-tooltip-item">{`Percentage of Deductions: ${percentage}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pie-chart-container">
      {" "}
      {/* Use className */}
      <h3>Deduction Breakdown</h3>
      <div style={{ width: "100%", height: 400 }}>
        {" "}
        {/* Recharts often needs explicit height on wrapper */}
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={150}
              fill="#8884d8"
              dataKey="amount"
              nameKey="category"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={14}
              iconType="circle"
              formatter={formatLegendValue}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="total-deductions-text">
        Total Deductions:{" "}
        {totalDeductions.toLocaleString("de-DE", {
          style: "currency",
          currency: "EUR",
        })}
      </p>
    </div>
  );
};

export default PieChartDisplay;
