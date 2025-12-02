import os
import json
import uuid
import tempfile
import base64
import io
import urllib.request
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import pypdfium2 as pdfium
from dotenv import load_dotenv
import PIL.Image

load_dotenv() 

GENAI_KEY = os.getenv("GOOGLE_API_KEY")
if not GENAI_KEY:
    print("WARNING: GOOGLE_API_KEY not found.")

genai.configure(api_key=GENAI_KEY)

app = FastAPI(title="Question Paper Extractor API")

origins = [
    "http://localhost:3000",
    "https://sastracker.vercel.app",
    "https://it.sastra.edu",
    "https://ict.sastra.edu",
    "https://soc.sastra.edu",
    "https://cse.sastra.edu"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    file_url: str

class Question(BaseModel):
    id: str
    number: str
    type: str 
    content: str
    marks: int
    isMath: bool
    hasImage: bool
    image_base64: Optional[str] = None 

class ExtractionResponse(BaseModel):
    questions: List[Question]
    total: int

def analyze_images_with_gemini(image_paths: List[str]) -> List[dict]:
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")

    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = """
    You are an expert exam digitizer. 
    Analyze the provided images of a question paper.
    Extract every single question individually.
    
    Rules:
    1. If a question spans multiple pages, merge it into one.
    2. Identify if the question is primarily text, math, or image-based.
    3. Extract the MARKS allocated for each question (integer). Look for numbers in brackets like [5], (2), or text like "10 marks". Default to 1 if not found.
    4. For Math: Convert expressions to valid LaTeX enclosed in single $...$ for inline or $$...$$ for block. ESCAPE backslashes.
    5. For Images: Set hasImage: true, provide page_number (1-indexed), and visual_bbox [ymin, xmin, ymax, xmax] (0-1000 scale).
    6. Return ONLY a valid JSON array of objects.
    
    JSON Structure per object:
    {
        "number": "Question number (e.g. 1, 2a, 3)",
        "type": "text" | "math" | "image",
        "content": "The full text content with LaTeX",
        "marks": int,
        "isMath": boolean,
        "hasImage": boolean,
        "page_number": int (optional),
        "visual_bbox": [ymin, xmin, ymax, xmax] (optional)
    }
    """

    pil_images = [PIL.Image.open(p) for p in image_paths]

    try:
        response = model.generate_content(
            [prompt, *pil_images],
            generation_config={"response_mime_type": "application/json"}
        )
        
        text_response = response.text
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0]
        elif "```" in text_response:
            text_response = text_response.split("```")[1]
            
        data = json.loads(text_response)
        
        for q in data:
            if q.get('hasImage') and 'visual_bbox' in q and 'page_number' in q:
                try:
                    page_idx = q['page_number'] - 1 
                    if 0 <= page_idx < len(pil_images):
                        target_img = pil_images[page_idx]
                        ymin, xmin, ymax, xmax = q['visual_bbox']
                        
                        width, height = target_img.size
                        left = xmin * width / 1000
                        top = ymin * height / 1000
                        right = xmax * width / 1000
                        bottom = ymax * height / 1000
                        
                        cropped_img = target_img.crop((left, top, right, bottom))
                        buffered = io.BytesIO()
                        cropped_img.save(buffered, format="JPEG")
                        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                        q['image_base64'] = f"data:image/jpeg;base64,{img_str}"
                except Exception as img_err:
                    print(f"Failed to crop image for Q{q.get('number')}: {img_err}")
        return data

    except json.JSONDecodeError as je:
        print(f"JSON Decode Error: {je}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON.")
    except Exception as e:
        print(f"AI Processing Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Processing Failed: {str(e)}")

@app.post("/extract", response_model=ExtractionResponse)
async def extract_questions(request: ExtractRequest):
    try:
        temp_filename = f"/tmp/{uuid.uuid4()}.pdf"
        urllib.request.urlretrieve(request.file_url, temp_filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download PDF from URL: {str(e)}")

    image_paths = []
    
    try:
        pdf = pdfium.PdfDocument(temp_filename)
        n_pages = min(len(pdf), 10) 
        
        for i in range(n_pages):
            page = pdf[i]
            bitmap = page.render(scale=2)
            pil_image = bitmap.to_pil()
            tmp_img_path = f"/tmp/page_{uuid.uuid4()}_{i}.jpg"
            pil_image.save(tmp_img_path, "JPEG")
            image_paths.append(tmp_img_path)

        extracted_data = analyze_images_with_gemini(image_paths)

        final_questions = []
        for q in extracted_data:
            final_questions.append(Question(
                id=str(uuid.uuid4()),
                number=str(q.get("number", "?")),
                type=q.get("type", "text"),
                content=q.get("content", ""),
                marks=int(q.get("marks", 0)),
                isMath=q.get("isMath", False),
                hasImage=q.get("hasImage", False),
                image_base64=q.get("image_base64", None)
            ))

        return {"questions": final_questions, "total": len(final_questions)}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        for p in image_paths:
            if os.path.exists(p):
                os.remove(p)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)