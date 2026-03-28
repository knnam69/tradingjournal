// Chart Utilities using Chart.js
const ChartColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  win: '#10b981',
  loss: '#ef4444',
  breakeven: '#f59e0b',
  buy: '#3b82f6',
  sell: '#f43f5e',
  palette: ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#f43f5e','#06b6d4','#a78bfa','#34d399']
};

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 16 }
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      titleFont: { family: 'Inter', weight: '600' },
      bodyFont: { family: 'Inter' }
    }
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' }
    },
    y: {
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' }
    }
  }
};

// Track chart instances for cleanup
const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function createLineChart(canvasId, labels, datasets, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...chartDefaults,
      ...options,
      elements: {
        line: { tension: 0.3, borderWidth: 2 },
        point: { radius: 2, hoverRadius: 5 }
      }
    }
  });
  return chartInstances[canvasId];
}

function createBarChart(canvasId, labels, datasets, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      ...chartDefaults,
      ...options,
      plugins: {
        ...chartDefaults.plugins,
        ...(options.plugins || {})
      }
    }
  });
  return chartInstances[canvasId];
}

function createDoughnutChart(canvasId, labels, data, colors, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'rgba(10, 14, 23, 0.8)',
        borderWidth: 3,
        hoverBorderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        ...chartDefaults.plugins,
        ...(options.plugins || {})
      },
      ...options
    }
  });
  return chartInstances[canvasId];
}
