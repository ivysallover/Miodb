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
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontWeight: 600,
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
    smooth: false
  },
  bar: {
    itemStyle: {
      barBorderWidth: 0
    }
  },
  pie: {
    itemStyle: {
      borderWidth: 3,
      borderColor: '#ffffff'
    }
  },
  scatter: {
    itemStyle: {
      borderWidth: 1,
      borderColor: '#ffffff'
    }
  },
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 }
    },
    axisTick: {
      show: true,
      lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 }
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
      lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 }
    },
    axisTick: {
      show: true,
      lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 }
    },
    axisLabel: {
      show: true,
      color: '#111111',
      fontWeight: 'bold'
    },
    splitLine: {
      show: true,
      lineStyle: { color: 'rgba(11,9,20,0.07)', width: 1 }
    }
  },
  logAxis: {
    axisLine: { show: true, lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 } },
    axisTick: { show: true, lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 } },
    axisLabel: { show: true, color: '#111111', fontWeight: 'bold' },
    splitLine: { show: true, lineStyle: { color: 'rgba(11,9,20,0.07)', width: 1 } }
  },
  timeAxis: {
    axisLine: { show: true, lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 } },
    axisTick: { show: true, lineStyle: { color: 'rgba(11,9,20,0.18)', width: 1 } },
    axisLabel: { show: true, color: '#111111', fontWeight: 'bold' },
    splitLine: { show: false }
  },
  tooltip: {
    backgroundColor: '#0b0914',
    borderColor: '#0b0914',
    textStyle: { color: '#ffffff', fontWeight: 600 },
    padding: [10, 14],
    borderRadius: 12
  }
};
