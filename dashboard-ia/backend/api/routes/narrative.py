from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
from schemas.responses import BaseSchema
from services.narrative_generator import generate_narrative

router = APIRouter()

class NarrativeRequest(BaseSchema):
    profile: Optional[Dict[str, Any]] = {}
    kpis: Optional[Dict[str, Any]] = {}
    anomalies: Optional[Dict[str, Any]] = {}
    forecast: Optional[Dict[str, Any]] = {}
    segmentation: Optional[Dict[str, Any]] = {}
    feature_importance: Optional[Dict[str, Any]] = {}
    target_col: Optional[str] = ""
    filename: Optional[str] = "dataset"

def _extract_metrics(item: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not item:
        return {}
    if "metrics" in item and isinstance(item["metrics"], dict):
        return item["metrics"]
    return item

@router.post("/narrative")
async def get_narrative(req: NarrativeRequest):
    try:
        profile_dict = req.profile or {}
        n_rows = profile_dict.get("n_rows") or profile_dict.get("nRows") or 0
        n_cols = profile_dict.get("n_cols") or profile_dict.get("nCols") or 0

        class ProfileMock:
            def __init__(self, rows: int, cols: int):
                self.n_rows = rows
                self.n_cols = cols

        anomalies_metrics = _extract_metrics(req.anomalies)
        forecast_metrics = _extract_metrics(req.forecast)
        segmentation_metrics = _extract_metrics(req.segmentation)
        feature_metrics = _extract_metrics(req.feature_importance)

        narrative_res = generate_narrative(
            df=None,
            profile=ProfileMock(n_rows, n_cols),
            target_col=req.target_col or "",
            kpis=req.kpis or {},
            anomaly_metrics=anomalies_metrics,
            forecast_metrics=forecast_metrics,
            segmentation_metrics=segmentation_metrics,
            feature_metrics=feature_metrics,
            filename=req.filename or "dataset",
        )
        return narrative_res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
