export const neoBrutalistTheme = {
  // Paleta accesible neo-brutalista compatible con daltonismo (protanopia, deuteranopia, tritanopia)
  // con alto contraste de luminosidad y bordes definidos
  color: [
    '#602cd1', // Violeta intenso (alto contraste sobre blanco)
    '#0072b2', // Azul accesible
    '#e69f00', // Naranja ámbar
    '#009e73', // Verde azulado
    '#d55e00', // Bermellón / Rojo anaranjado
    '#cc79a7', // Púrpura rojizo
    '#bdf559', // Lima MIO (con borde negro 2px)
    '#111111'  // Negro de alto contraste
  ],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    fontWeight: 'bold',
    color: '#111111'
  },
  title: {
    textStyle: {
      color: '#111111',
      fontWeight: 900
    },
    subtextStyle: {
      color: '#666666',
      fontWeight: 600
    }
  },
  line: {
    itemStyle: { borderWidth: 3 },
    lineStyle: { width: 3 },
    symbolSize: 6,
    symbol: 'circle',
    smooth: false // Neo-brutalism prefers sharp angles
  },
  bar: {
    itemStyle: {
      barBorderWidth: 2,
      barBorderColor: '#111111'
    }
  },
  pie: {
    itemStyle: {
      borderWidth: 2,
      borderColor: '#111111'
    }
  },
  scatter: {
    itemStyle: {
      borderWidth: 2,
      borderColor: '#111111'
    }
  },
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: { color: '#111111', width: 2 }
    },
    axisTick: {
      show: true,
      lineStyle: { color: '#111111', width: 2 }
    },
    axisLabel: {
      show: true,
      color: '#111111',
      fontWeight: 'bold'
    },
    splitLine: {
      show: false
    }
  },
  valueAxis: {
    axisLine: {
      show: true,
      lineStyle: { color: '#111111', width: 2 }
    },
    axisTick: {
      show: true,
      lineStyle: { color: '#111111', width: 2 }
    },
    axisLabel: {
      show: true,
      color: '#111111',
      fontWeight: 'bold'
    },
    splitLine: {
      show: true,
      lineStyle: { color: '#e5e7eb', width: 1, type: 'dashed' }
    }
  },
  logAxis: {
    axisLine: { show: true, lineStyle: { color: '#111111', width: 2 } },
    axisTick: { show: true, lineStyle: { color: '#111111', width: 2 } },
    axisLabel: { show: true, color: '#111111', fontWeight: 'bold' },
    splitLine: { show: true, lineStyle: { color: '#e5e7eb', width: 1, type: 'dashed' } }
  },
  timeAxis: {
    axisLine: { show: true, lineStyle: { color: '#111111', width: 2 } },
    axisTick: { show: true, lineStyle: { color: '#111111', width: 2 } },
    axisLabel: { show: true, color: '#111111', fontWeight: 'bold' },
    splitLine: { show: false }
  },
  tooltip: {
    backgroundColor: '#111111',
    borderColor: '#111111',
    textStyle: { color: '#ffffff', fontWeight: 'bold' },
    padding: [12, 16],
    borderRadius: 0 // Sharp corners
  }
};
