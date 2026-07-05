import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";

import { Pie, Bar, Scatter, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
);

export function SegmentPie({ data, showPercent = true }) {
  const values = Object.values(data || {});
  const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0) || 1;

  return (
    <Pie
      data={{
        labels: Object.keys(data),
        datasets: [
          {
            data: Object.values(data),
            backgroundColor: ["#1d4ed8", "#0ea5e9", "#f59e0b", "#22c55e", "#a855f7", "#ef4444"],
            borderWidth: 0,
          },
        ],
      }}
      options={{
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = Number(context.parsed) || 0;
                if (!showPercent) return `${context.label}: ${value}`;
                const percent = Math.round((value / total) * 1000) / 10;
                return `${context.label}: ${percent}%`;
              },
            },
          },
        },
      }}
    />
  );
}

export function RevenueBar({ data, label = "Revenue" }) {
  // Clean up feature names for better display
  const cleanLabel = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const labels = Object.keys(data);
  const cleanedLabels = labels.map(cleanLabel);
  const values = Object.values(data);
  const maxValue = Math.max(...values);
  
  // Create gradient colors based on value
  const getGradientColor = (value) => {
    const ratio = value / maxValue;
    if (ratio > 0.75) return '#1d4ed8'; // Dark blue for highest
    if (ratio > 0.5) return '#3b82f6';  // Medium blue
    if (ratio > 0.25) return '#60a5fa'; // Light blue
    return '#93c5fd'; // Very light blue
  };
  
  const backgroundColors = values.map((v) => getGradientColor(v));
  
  return (
    <Bar
      data={{
        labels: cleanedLabels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: backgroundColors,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: '#0f172a',
            hoverBorderColor: '#0f172a',
          },
        ],
      }}
      options={{
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 12,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            borderColor: '#e2e8f0',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              title: (context) => {
                const originalName = labels[context[0].dataIndex];
                return originalName;
              },
              label: (context) => {
                return `${label}: ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: { 
          y: { 
            grid: { display: true, color: '#f1f5f9', drawBorder: false },
            ticks: {
              font: { size: 11, color: '#64748b' },
              color: '#64748b',
            },
            border: { display: false }
          }, 
          x: { 
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45,
              font: { size: 10, color: '#475569' },
              color: '#475569',
            },
            border: { display: false }
          } 
        },
        maintainAspectRatio: true,
        responsive: true,
      }}
    />
  );
}

export function TrendLine({ labels, series }) {
  return (
    <Line
      data={{
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data,
          borderColor: s.color,
          backgroundColor: `${s.color}33`,
          fill: true,
          tension: 0.35,
        })),
      }}
      options={{ plugins: { legend: { position: "bottom" } }, scales: { x: { grid: { display: false } } } }}
    />
  );
}

export function BehaviorBar({ labels, values, color = "#0ea5e9" }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: color,
            borderRadius: 8,
          },
        ],
      }}
      options={{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }}
    />
  );
}

export function LifecycleBar({ labels, values }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#22c55e", "#0ea5e9", "#f59e0b", "#ef4444", "#6b7280"],
            borderRadius: 8,
          },
        ],
      }}
      options={{ plugins: { legend: { display: false } } }}
    />
  );
}

export function RFMScatter({ customers }) {
  // Segment customers by RFM score for color coding
  const getSegmentColor = (freq, monetary) => {
    if (freq > 15 && monetary > 700) return { bg: "#10b981", border: "#059669" }; // Champions - green
    if (freq > 10 && monetary > 500) return { bg: "#3b82f6", border: "#2563eb" }; // Loyal - blue
    if (freq > 7 && monetary > 400) return { bg: "#0ea5e9", border: "#0284c7" }; // Potential - cyan
    if (freq > 4 && monetary > 250) return { bg: "#f59e0b", border: "#d97706" }; // At Risk - amber
    return { bg: "#ef4444", border: "#dc2626" }; // Hibernating - red
  };

  return (
    <Scatter
      data={{
        datasets: [
          {
            label: "Customers",
            data: customers.map((c) => ({ x: c.Frequency, y: c.Monetary })),
            backgroundColor: customers.map((c) => getSegmentColor(c.Frequency, c.Monetary).bg),
            borderColor: customers.map((c) => getSegmentColor(c.Frequency, c.Monetary).border),
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointHoverBorderWidth: 3,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#fff",
            bodyColor: "#e2e8f0",
            padding: 12,
            borderColor: "rgba(148, 163, 184, 0.3)",
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const customer = customers[context.dataIndex];
                return [
                  `Frequency: ${customer.Frequency} orders`,
                  `Value: $${customer.Monetary}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Purchase Frequency →",
              color: "#64748b",
              font: { size: 12, weight: "600" },
            },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
            ticks: { color: "#64748b" },
          },
          y: {
            title: {
              display: true,
              text: "Monetary Value ($) →",
              color: "#64748b",
              font: { size: 12, weight: "600" },
            },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
            ticks: {
              color: "#64748b",
              callback: (value) => "$" + value,
            },
          },
        },
      }}
    />
  );
}
