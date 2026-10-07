/**
 * ECharts, with only what the dashboard draws. Importing the whole library adds several
 * hundred KB that no chart here uses; a chart type or component that is missing from this list
 * simply does not render, so add it here when a builder starts using one.
 */
import * as echarts from 'echarts/core';
import { BarChart, BoxplotChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts';
import {
  AriaComponent,
  DatasetComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, BoxplotChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart,
  AriaComponent, DatasetComponent, DataZoomComponent, GridComponent, LegendComponent,
  MarkAreaComponent, MarkLineComponent, MarkPointComponent, RadarComponent, TitleComponent,
  TooltipComponent, TransformComponent, VisualMapComponent,
  LabelLayout, UniversalTransition, CanvasRenderer,
]);

export { echarts };
