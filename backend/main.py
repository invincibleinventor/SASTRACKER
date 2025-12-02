import os
import json
import uuid
import tempfile
import base64
import io
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import pypdfium2 as pdfium
from dotenv import load_dotenv
import PIL.Image
import re

load_dotenv() 

GENAI_KEY = os.getenv("GOOGLE_API_KEY")
if not GENAI_KEY:
    print("WARNING: GOOGLE_API_KEY not found.")

genai.configure(api_key=GENAI_KEY)

app = FastAPI(title="Question Paper Extractor API")

origins = [
    "http://localhost:3000",
    "http://localhost:3000/upload",
    "http://127.0.0.1:3000/upload",
    "http://127.0.0.1:3000",
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
    Extract every single question individually into a JSON array.

    **CRITICAL INSTRUCTION FOR MARKS:**
    1.  **Scan Section Headers First:** Look for text like "PART A (10 x 2 = 20 Marks)", "5 x 2 = 10", "Answer all questions (10 Marks)".
    2.  **Deduce Individual Marks:** - If a header says "10 x 2 = 20", it means there are 10 questions, and **EACH question is worth 2 marks**.
        - If a header says "5 x 10 = 50", it means **EACH question is worth 10 marks**.
    3.  **Apply to Questions:** Apply this deduced mark value to EVERY question under that section unless a specific mark is written next to the question itself (e.g., "(5)" or "[3]").
    4.  **Split Questions:** If Question 6 has sub-questions (a) and (b), and the section is 10 marks:
        - If (a) and (b) have explicit marks (e.g., "5+5"), use those.
        - If not, assume they share the total marks (e.g., 5 each). Or if it says "(OR)", treat them as alternatives worth the full 10 marks each.

    **General Rules:**
    1. Merge questions spanning multiple pages.
    2. Identify type: 'text', 'math', or 'image'.
    3. Math: Use LaTeX with double escaped backslashes (e.g., \\\\frac).
    4. Images: Set hasImage: true and provide bounding box [ymin, xmin, ymax, xmax] (0-1000).

    **JSON Output Format:**
    [
      {
        "number": "1",
        "type": "text",
        "content": "Define Viscosity.",
        "marks": 2, 
        "isMath": false,
        "hasImage": false
      }
    ]
    """

    pil_images = [PIL.Image.open(p) for p in image_paths]

    try:
        response = model.generate_content(
            [prompt, *pil_images],
            generation_config={"response_mime_type": "application/json"}
        )
        
        text_response = response.text
        # Cleanup
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0]
        elif "```" in text_response:
            text_response = text_response.split("```")[1]
            
        # Fallback cleanup for bad latex escapes
        try:
            data = json.loads(text_response)
        except json.JSONDecodeError:
            cleaned = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', text_response)
            data = json.loads(cleaned)
        
        # Crop Images
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
                except Exception:
                    pass # Skip image if crop fails
        return data

    except Exception as e:
        print(f"AI Error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI Processing Failed")

@app.post("/extract", response_model=ExtractionResponse)
async def extract_questions(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir='/tmp') as tmp_pdf:
        tmp_pdf.write(await file.read())
        tmp_pdf_path = tmp_pdf.name

    image_paths = []
    
    try:
        pdf = pdfium.PdfDocument(tmp_pdf_path)
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
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)
        for p in image_paths:
            if os.path.exists(p):
                os.remove(p)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)