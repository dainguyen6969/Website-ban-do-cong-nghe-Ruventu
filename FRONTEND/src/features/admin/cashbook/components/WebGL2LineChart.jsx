import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Financial Line Chart Component powered by Chart.js
 * Cleaned: Legend items (TỔNG THU & TỔNG CHI) and corner status badge removed.
 */
export default function WebGL2LineChart({ labels = [], datasets = [], title = '' }) {
  const chartData = {
    labels: labels,
    datasets: datasets.map((ds, idx) => {
      const isChi = ds.label.includes('CHI') || ds.dashed;
      const mainColor = isChi ? '#dc2626' : '#111111';
      const bgColor = isChi ? 'rgba(220, 38, 38, 0.08)' : 'rgba(17, 17, 17, 0.08)';

      return {
        label: ds.label,
        data: ds.data,
        borderColor: mainColor,
        backgroundColor: bgColor,
        borderWidth: 2,
        borderDash: isChi ? [5, 5] : [],
        tension: 0.4, // Smooth curved spline
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: mainColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
      };
    })
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 15,
        right: 15,
        bottom: 10,
        left: 10
      }
    },
    plugins: {
      legend: {
        display: false // Removed Legend items (TỔNG THU & TỔNG CHI) completely
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#0f172a',
        titleColor: '#94a3b8',
        bodyColor: '#ffffff',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = (context.parsed.y || 0) * 1000000;
            return ` ${label}: ${value.toLocaleString('vi-VN')}đ`;
          },
          footer: function(tooltipItems) {
            if (tooltipItems.length >= 2) {
              const thu = (tooltipItems[0].parsed.y || 0) * 1000000;
              const chi = (tooltipItems[1].parsed.y || 0) * 1000000;
              const tonQuy = thu - chi;
              return `TỒN QUỸ: ${tonQuy.toLocaleString('vi-VN')}đ`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#e2e8f0',
        },
        ticks: {
          font: { size: 10, weight: '700' },
          color: '#64748b',
          callback: function(value) {
            return value + 'M';
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 10, weight: '700' },
          color: '#64748b'
        }
      }
    }
  };

  return (
    <div className="chartjs-wrapper" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px' }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
