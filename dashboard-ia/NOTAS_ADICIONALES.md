## Fix 5: Heatmap de correlación (Pendiente de refactor a chartjs-chart-matrix)
- Actualmente se usa un gráfico Radar para "Red de Correlación" porque `chartjs-chart-matrix` no fue implementada en este ciclo (por tiempo y para mantener estabilidad del renderer sin sumar librerías no probadas).
- Plan a futuro: 
  1. Instalar `chartjs-chart-matrix` en frontend.
  2. Modificar `backend/core/chart_generator.py` para devolver `{x: var1, y: var2, v: corr_value}` en `datasets.data`.
  3. Registrar el controller `MatrixController` en `ChartRenderer.tsx` y agregar una rama `if (chartData.type === 'matrix')`.

## Fix 12: Export a PDF/PPTX con gráficos incrustados (Pendiente)
- Actualmente los reportes son 100% texto sin imágenes.
- El plan propuesto para incluirlos:
  1. Capturar cada gráfico desde el frontend en base64 con `chart.toBase64Image()` o HTML2Canvas.
  2. Agregar esas strings base64 en la request POST a `/api/export/pdf` y `/api/export/pptx`.
  3. Modificar `pdf_generator.py` y `pptx_generator.py` para recibir la lista de base64 y guardarlas temporalmente usando la librería `tempfile` de Python.
  4. Incrustar esas imágenes en el PDF generado usando FPDF (`pdf.image(file)`) o en el PPTX (`slide.shapes.add_picture()`).
