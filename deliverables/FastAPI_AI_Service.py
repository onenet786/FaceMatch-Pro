# -*- coding: utf-8 -*-
"""
FaceMatch Pro: Standalone AI Recognition Service
Uses FastAPI, InsightFace (ArcFace), OpenCV, and NumPy/FAISS.
"""

import os
import cv2
import numpy as np
import base64
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

# --- INITIALIZATION ---
app = FastAPI(
    title="FaceMatch Pro AI Recognition Service",
    description="High-fidelity 512-dimensional vector facial indexing engine.",
    version="1.0.0"
)

# Lazy loading of ML models to ensure startup efficiency
import insightface
from insightface.app import FaceAnalysis

# Initialize InsightFace buffalo_l detector/recognizer
# Runs automatically on CUDA GPU if available, else falls back to CPU
try:
    face_analyzer = FaceAnalysis(name='buffalo_l', root='./models')
    face_analyzer.prepare(ctx_id=0, det_size=(640, 640))
except Exception as e:
    print(f"CUDA Init failed, fallback to CPU mode: {e}")
    face_analyzer = FaceAnalysis(name='buffalo_l', root='./models')
    face_analyzer.prepare(ctx_id=-1, det_size=(640, 640))


# --- PYDANTIC MODELS ---
class ImagePayload(BaseModel):
    image_b64: str  # Base64 string of the JPEG/PNG frame

class QualityResponse(BaseModel):
    is_clear: bool
    blur_score: float
    resolution_ok: bool
    width: int
    height: int
    occluded: bool

class BoundingBox(BaseModel):
    xmin: float
    ymin: float
    xmax: float
    ymax: float

class FaceDetectionItem(BaseModel):
    box: BoundingBox
    confidence: float
    quality: QualityResponse

class DetectResponse(BaseModel):
    face_count: int
    faces: List[FaceDetectionItem]

class EmbeddingResponse(BaseModel):
    embedding: List[float]

class ComparePayload(BaseModel):
    embedding_a: List[float]
    embedding_b: List[float]

class CompareResponse(BaseModel):
    cosine_distance: float
    similarity_percentage: float

class SearchCandidate(BaseModel):
    person_id: str
    similarity_score: float

class SearchPayload(BaseModel):
    query_embedding: List[float]
    candidates: List[dict]  # List of {"person_id": str, "embedding": List[float]}


# --- HELPERS ---
def decode_base64_image(b64_str: str) -> np.ndarray:
    """Decodes a base64 string into an OpenCV BGR numpy image matrix."""
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",")[1]
        img_data = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("CV2 failed to decode decoded base64 array.")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode failure: {str(e)}")

def assess_blur_laplacian(img: np.ndarray) -> float:
    """Calculates blur value via the variance of the Laplacian operator."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def check_mask_occlusion(face_crop: np.ndarray) -> bool:
    """
    Simulates surgical mask/occlusion checking.
    Analyzes the lower third ratio of the face crop for uniform white/blue medical colors
    or low entropy features representing face covers.
    """
    try:
        h, w, _ = face_crop.shape
        lower_third = face_crop[int(h*0.65):h, 0:w]
        hsv = cv2.cvtColor(lower_third, cv2.COLOR_BGR2HSV)
        
        # Medical blue-green range
        lower_blue = np.array([80, 40, 40])
        upper_blue = np.array([130, 255, 255])
        mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
        
        # Surgical white mask range
        lower_white = np.array([0, 0, 200])
        upper_white = np.array([180, 30, 255])
        mask_white = cv2.inRange(hsv, lower_white, upper_white)
        
        blue_ratio = np.sum(mask_blue > 0) / (lower_third.shape[0] * lower_third.shape[1])
        white_ratio = np.sum(mask_white > 0) / (lower_third.shape[0] * lower_third.shape[1])
        
        # If blue medical mask or heavy white drape covers more than 25% of the mouth zone, reject
        return blue_ratio > 0.25 or white_ratio > 0.25
    except:
        return False


# --- API ROUTES ---

@app.post("/detect", response_model=DetectResponse)
def detect_faces(payload: ImagePayload):
    """
    Exposes face detection. Analyzes counts, bounding coordinates,
    and returns blur/mask telemetry.
    """
    img = decode_base64_image(payload.image_b64)
    h, w, _ = img.shape
    
    # Process InsightFace frame analysis
    faces_detected = face_analyzer.get(img)
    
    face_items = []
    for face in faces_detected:
        bbox = face.bbox.astype(float)
        xmin, ymin, xmax, ymax = max(0, bbox[0]), max(0, bbox[1]), min(w, bbox[2]), min(h, bbox[3])
        
        # Extract face crop for quality gates
        crop = img[int(ymin):int(ymax), int(xmin):int(xmax)]
        if crop.size == 0:
            continue
            
        blur_score = assess_blur_laplacian(crop)
        is_clear = blur_score > 100.0 # Threshold value: 100 representing clean focus
        resolution_ok = (crop.shape[0] >= 112) and (crop.shape[1] >= 112)
        occluded = check_mask_occlusion(crop)
        
        quality = QualityResponse(
            is_clear=is_clear,
            blur_score=blur_score,
            resolution_ok=resolution_ok,
            width=int(crop.shape[1]),
            height=int(crop.shape[0]),
            occluded=occluded
        )
        
        face_items.append(FaceDetectionItem(
            box=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
            confidence=float(face.det_score),
            quality=quality
        ))
        
    return DetectResponse(face_count=len(face_items), faces=face_items)


@app.post("/extract-embedding", response_model=EmbeddingResponse)
def extract_embedding(payload: ImagePayload):
    """
    Processes ArcFace 512-dimension vector embedding extraction.
    Takes largest face if multiple are present in image frame.
    """
    img = decode_base64_image(payload.image_b64)
    faces = face_analyzer.get(img)
    
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No human face found in image.")
        
    # Sort by bounding box area to extract the closest major face
    faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)
    target_face = faces[0]
    
    # Extract norm 512 dimensions float array
    emb = target_face.embedding.tolist()
    return EmbeddingResponse(embedding=emb)


@app.post("/compare-1-1", response_model=CompareResponse)
def compare_one_to_one(payload: ComparePayload):
    """
    Calculates 1:1 Cosine Similarity between two face vectors.
    Returns cosine distance and user friendly match rating.
    """
    v_a = np.array(payload.embedding_a)
    v_b = np.array(payload.embedding_b)
    
    # Cosine similarity formulation: (A.B) / (||A||*||B||)
    dot_product = np.dot(v_a, v_b)
    norm_a = np.linalg.norm(v_a)
    norm_b = np.linalg.norm(v_b)
    
    cosine_sim = dot_product / (norm_a * norm_b)
    
    # Normalize score range to user-friendly percentage
    # Cosine range is [-1, 1], typical matches are [0.2, 0.85] in biometric distributions
    sim_percent = max(0.0, min(100.0, (cosine_sim + 1) / 2 * 100))
    
    return CompareResponse(
        cosine_distance=float(1.0 - cosine_sim),
        similarity_percentage=float(sim_percent)
    )


@app.post("/search-1-N", response_model=List[SearchCandidate])
def search_one_to_many(payload: SearchPayload):
    """
    Scans a query vector across candidate listings.
    Computes Euclidean-cosine nearest neighbors and returns rankings.
    """
    q_emb = np.array(payload.query_embedding)
    results = []
    
    for cand in payload.candidates:
        c_emb = np.array(cand["embedding"])
        
        dot = np.dot(q_emb, c_emb)
        n_q = np.linalg.norm(q_emb)
        n_c = np.linalg.norm(c_emb)
        sim = dot / (n_q * n_c)
        sim_percent = max(0.0, min(100.0, (sim + 1) / 2 * 100))
        
        results.append(SearchCandidate(
            person_id=cand["person_id"],
            similarity_score=float(sim_percent)
        ))
        
    # Sort high-similarity to low-similarity
    results = sorted(results, key=lambda x: x.similarity_score, reverse=True)
    return results[:5] # Top 5 nearest neighbors


# --- RUN BLOCK ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
