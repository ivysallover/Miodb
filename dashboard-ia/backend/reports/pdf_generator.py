"""
reports/pdf_generator.py
Generación de reportes PDF ejecutivos con gráficos incrustados desde el backend FastAPI.
"""

from __future__ import annotations
import os
import io
import base64
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    from fpdf import FPDF
    from fpdf.enums import XPos, YPos
    FPDF_AVAILABLE = True
except ImportError:
    FPDF_AVAILABLE = False


class DashboardPDF(FPDF):
    def __init__(self, title: str = "Informe Ejecutivo"):
        super().__init__()
        self.report_title = title
        self.set_margins(15, 15, 15)

    def header(self):
        self.set_fill_color(129, 90, 225)
        self.rect(0, 0, 210, 22, "F")
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 13)
        self.set_y(6)
        self.cell(0, 10, "Dashboard IA - Analitica & Machine Learning", align="C")
        self.set_text_color(0, 0, 0)
        self.ln(18)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} | Pagina {self.page_no()}", align="C")

    def section_title(self, title: str):
        self.set_font("Helvetica", "B", 11)
        self.set_fill_color(243, 240, 255)
        self.set_text_color(129, 90, 225)
        self.cell(0, 8, f"  {title}", border=0, new_x=XPos.LMARGIN, new_y=YPos.NEXT, fill=True)
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def body_text(self, text: str, font_size: int = 9):
        self.set_font("Helvetica", "", font_size)
        self.set_text_color(50, 50, 50)
        
        replacements = {
            '"': '"', '"': '"', "'": "'", "'": "'",
            '-': '-', '-': '-', '...': '...',
            'EUR': 'EUR', 'GBP': 'GBP', 'JPY': 'JPY',
        }
        clean_text = text.replace("**", "").replace("##", "").replace("#", "")
        for k, v in replacements.items():
            clean_text = clean_text.replace(k, v)
        
        clean_text = clean_text.encode("latin-1", errors="replace").decode("latin-1")
        self.multi_cell(0, 5, clean_text)
        self.ln(2)


def generate_pdf_report(
    filename: str,
    target_col: str,
    kpis: dict,
    narrative_text: str,
    profile: dict,
    anomaly_metrics: dict = {},
    forecast_metrics: dict = {},
    segmentation_metrics: dict = {},
    chart_images: Optional[List[Dict[str, Any]]] = None,
) -> Optional[bytes]:
    if not FPDF_AVAILABLE:
        return None

    try:
        pdf = DashboardPDF(title=f"Analisis: {filename}")
        pdf.set_auto_page_break(auto=True, margin=18)
        pdf.add_page()

        # Portada / Encabezado
        pdf.set_font("Helvetica", "B", 15)
        pdf.set_text_color(17, 17, 17)
        safe_filename = filename.encode("latin-1", errors="replace").decode("latin-1")
        pdf.cell(0, 8, f"Informe Ejecutivo: {safe_filename}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(100, 100, 100)
        n_rows = profile.get("n_rows", profile.get("nRows", "N/A"))
        n_cols = profile.get("n_cols", profile.get("nCols", "N/A"))
        pdf.cell(0, 5, f"Metrica Analizada: {target_col} | Registros: {n_rows} | Columnas: {n_cols}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        pdf.ln(4)

        # 1. Indicadores Principales y Salud
        pdf.section_title("1. Indicadores Clave de Rendimiento (KPIs)")
        kpi_str = "  |  ".join([f"{k}: {v}" for k, v in kpis.items()])
        pdf.body_text(kpi_str, font_size=9)

        q_score = profile.get("quality_score", profile.get("qualityScore", 100))
        q_label = profile.get("quality_label", profile.get("qualityLabel", "Alta"))
        pdf.body_text(f"Salud de Datos: {q_score}/100 ({q_label}) | Diagnostico integral completado.")

        # 2. Sintesis Ejecutiva
        pdf.section_title("2. Sintesis Ejecutiva & Diagnostico")
        pdf.body_text(narrative_text or "No se genero narrativa para este analisis.")

        # 3. Modelos de Machine Learning
        has_ml = False
        if (anomaly_metrics and "n_anomalias" in anomaly_metrics) or (forecast_metrics and "tendencia_pct" in forecast_metrics):
            has_ml = True
            pdf.section_title("3. Hallazgos de Modelos Predictivos y Analiticos")
            if anomaly_metrics and "n_anomalias" in anomaly_metrics:
                pdf.body_text(f"Deteccion de Anomalias: {anomaly_metrics['n_anomalias']} registros atipicos detectados ({anomaly_metrics.get('pct_anomalias', 0)}%).")
            if forecast_metrics and "tendencia_pct" in forecast_metrics:
                pdf.body_text(f"Proyeccion Temporal: Tendencia estimada de {forecast_metrics['tendencia_pct']}% en horizonte de {forecast_metrics.get('periodos', 60)} dias.")

        # 4. Graficos del Dashboard (Incrustacion de imagenes PNG)
        if chart_images and len(chart_images) > 0:
            section_num = "4" if has_ml else "3"
            pdf.section_title(f"{section_num}. Visualizaciones y Analitica Grafica")
            
            for chart in chart_images:
                title = chart.get("title", "Visualizacion")
                b64_data = chart.get("base64", "")
                if not b64_data:
                    continue

                try:
                    if b64_data.startswith("data:image"):
                        b64_data = b64_data.split(",", 1)[1]
                    img_bytes = base64.b64decode(b64_data)
                    img_stream = io.BytesIO(img_bytes)

                    # Verificar si entra en la pagina actual (imagen requiere aprox 85mm)
                    if pdf.get_y() > 190:
                        pdf.add_page()

                    pdf.set_font("Helvetica", "B", 9)
                    pdf.set_text_color(55, 65, 81)
                    clean_title = title.encode("latin-1", errors="replace").decode("latin-1")
                    pdf.cell(0, 6, clean_title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                    
                    # Dibujar imagen centrada
                    pdf.image(img_stream, x=20, y=pdf.get_y(), w=170)
                    pdf.ln(80)
                except Exception as img_err:
                    print(f"Error incrustando imagen de grafico '{title}': {img_err}")
                    continue

        return bytes(pdf.output())
    except Exception as e:
        print(f"Error generando PDF: {e}")
        return None
