"""
reports/pptx_generator.py
Generación de presentaciones PPTX ejecutivas con diapositivas dedicadas por gráfico.
"""
import io
import base64
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from datetime import datetime
from typing import Optional, List, Dict, Any

def generate_pptx_report(
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
    try:
        prs = Presentation()
        
        # SLIDE 1: Title
        title_slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_slide_layout)
        title = slide.shapes.title
        subtitle = slide.placeholders[1]
        
        title.text = f"Analisis Ejecutivo: {filename}"
        subtitle.text = f"Plataforma Dashboard IA\nGenerado el {datetime.now().strftime('%d/%m/%Y')}"
        
        title.text_frame.paragraphs[0].font.name = 'Arial'
        title.text_frame.paragraphs[0].font.bold = True
        title.text_frame.paragraphs[0].font.color.rgb = RGBColor(129, 90, 225)
        
        # SLIDE 2: KPIs & Profile
        bullet_slide_layout = prs.slide_layouts[1]
        slide2 = prs.slides.add_slide(bullet_slide_layout)
        shapes2 = slide2.shapes
        title2 = shapes2.title
        body2 = shapes2.placeholders[1]
        
        title2.text = "Metricas Principales"
        tf2 = body2.text_frame
        
        n_rows = profile.get("n_rows", profile.get("nRows", "N/A"))
        n_cols = profile.get("n_cols", profile.get("nCols", "N/A"))
        tf2.text = f"Dataset: {n_rows} registros, {n_cols} columnas."
        
        p = tf2.add_paragraph()
        p.text = f"Columna Objetivo: {target_col}"
        p.level = 1
        
        for k, v in kpis.items():
            p = tf2.add_paragraph()
            p.text = f"{k}: {v}"
            p.level = 1
            
        p2 = tf2.add_paragraph()
        q_score = profile.get("quality_score", profile.get("qualityScore", 100))
        q_label = profile.get("quality_label", profile.get("qualityLabel", "Alta"))
        p2.text = f"Calidad de Datos: {q_score}/100 ({q_label})"
        p2.level = 1

        # SLIDE 3: AI Narrative
        slide3 = prs.slides.add_slide(bullet_slide_layout)
        shapes3 = slide3.shapes
        title3 = shapes3.title
        body3 = shapes3.placeholders[1]
        
        title3.text = "Sintesis Ejecutiva IA"
        clean_narrative = (
            (narrative_text or "Sin informe narrativo.")
            .replace("**", "")
            .replace("##", "")
            .replace("#", "")
        )
        body3.text_frame.text = clean_narrative
        
        # SLIDE 4: Machine Learning Highlights (si aplica)
        if anomaly_metrics or forecast_metrics:
            slide4 = prs.slides.add_slide(bullet_slide_layout)
            shapes4 = slide4.shapes
            title4 = shapes4.title
            body4 = shapes4.placeholders[1]
            
            title4.text = "Resultados de Machine Learning"
            tf4 = body4.text_frame
            tf4.text = "Resumen de Modelos Predictivos"
            
            if forecast_metrics and "tendencia_pct" in forecast_metrics:
                p = tf4.add_paragraph()
                p.text = f"Proyeccion: Tendencia esperada del {forecast_metrics['tendencia_pct']}% en {forecast_metrics.get('periodos', 60)} dias."
                p.level = 1
                
            if anomaly_metrics and "n_anomalias" in anomaly_metrics:
                p = tf4.add_paragraph()
                p.text = f"Anomalias: {anomaly_metrics['n_anomalias']} registros atipicos detectados ({anomaly_metrics.get('pct_anomalias', 0)}%)."
                p.level = 1

        # SLIDES 5+: Diapositiva dedicada por cada gráfico
        if chart_images and len(chart_images) > 0:
            blank_layout = prs.slide_layouts[5] # Title only layout
            for chart in chart_images:
                title_str = chart.get("title", "Visualizacion Grafica")
                b64_data = chart.get("base64", "")
                if not b64_data:
                    continue

                try:
                    if b64_data.startswith("data:image"):
                        b64_data = b64_data.split(",", 1)[1]
                    img_bytes = base64.b64decode(b64_data)
                    img_stream = io.BytesIO(img_bytes)

                    c_slide = prs.slides.add_slide(blank_layout)
                    c_title = c_slide.shapes.title
                    if c_title:
                        c_title.text = title_str
                        c_title.text_frame.paragraphs[0].font.size = Pt(22)
                        c_title.text_frame.paragraphs[0].font.bold = True
                        c_title.text_frame.paragraphs[0].font.color.rgb = RGBColor(17, 17, 17)

                    # Insertar imagen centrada
                    left = Inches(1.0)
                    top = Inches(1.8)
                    width = Inches(8.0)
                    c_slide.shapes.add_picture(img_stream, left, top, width=width)
                except Exception as img_err:
                    print(f"Error incrustando imagen en diapositiva '{title_str}': {img_err}")
                    continue

        # Guardar en memoria
        ppt_stream = io.BytesIO()
        prs.save(ppt_stream)
        ppt_stream.seek(0)
        return ppt_stream.read()
        
    except Exception as e:
        print(f"Error generando PPTX: {e}")
        return None
