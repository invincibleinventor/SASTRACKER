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
import pypdfium2 as pdfium  # REPLACED pdf2image
from dotenv import load_dotenv
import PIL.Image

# --- Configuration ---
load_dotenv() 

# Configure Gemini
GENAI_KEY = os.getenv("GOOGLE_API_KEY")
if not GENAI_KEY:
    print("WARNING: GOOGLE_API_KEY not found in environment variables.")

genai.configure(api_key=GENAI_KEY)

# Initialize FastAPI
app = FastAPI(title="Question Paper Extractor API")

# --- CORS Configuration ---
# Update this list with your actual Vercel frontend URL
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

# --- Data Models ---
class Question(BaseModel):
    id: str
    number: str
    type: str 
    content: str
    isMath: bool
    hasImage: bool
    image_base64: Optional[str] = None 

class ExtractionResponse(BaseModel):
    questions: List[Question]
    total: int

# --- Helper Functions ---

def analyze_images_with_gemini(image_paths: List[str]) -> List[dict]:
    """
    Sends images to Gemini 2.5 Flash for question extraction.
    """
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")

    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Prepare the prompt
    prompt = """
    You are an expert exam digitizer. 
    Analyze the provided images of a question paper.
    Extract every single question individually.
    
    Rules:
    1. If a question spans multiple pages, merge it into one.
    2. Identify if the question is primarily text, math (contains equations), or image-based (relies on a diagram).
    3. For Math: Convert all mathematical expressions to valid LaTeX enclosed in single $...$ for inline or $$...$$ for block. 
       IMPORTANT: You must ESCAPE all backslashes in the JSON string (e.g., use "\\frac" instead of "\frac").
    4. For Images: If the question has a diagram/figure:
       - Set "hasImage": true.
       - Provide "page_number" (integer, 1-indexed) indicating which page contains the image.
       - Provide "visual_bbox": [ymin, xmin, ymax, xmax] (integers, 0-1000 scale) representing the bounding box of the diagram.
    5. Return ONLY a valid JSON array of objects.
    
    JSON Structure per object:
    {
        "number": "Question number (e.g. 1, 2a, 3)",
        "type": "text" | "math" | "image",
        "content": "The full text content with LaTeX",
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
        
        # --- Post-Processing: Crop Images ---
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
        print(f"Raw Response: {text_response}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Try again.")
    except Exception as e:
        print(f"AI Processing Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Processing Failed: {str(e)}")

# --- Endpoints ---

@app.post("/extract", response_model=ExtractionResponse)
async def extract_questions(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Save Upload temporarily
    # Note: Vercel /tmp is the only writable directory
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir='/tmp') as tmp_pdf:
        tmp_pdf.write(await file.read())
        tmp_pdf_path = tmp_pdf.name

    image_paths = []
    
    try:
        # 1. Convert PDF to Images using pypdfium2 (No Poppler required!)
        pdf = pdfium.PdfDocument(tmp_pdf_path)
        
        # Render pages
        # Limit to first 5 pages to prevent timeouts on Vercel Free Tier
        n_pages = min(len(pdf), 5) 
        
        for i in range(n_pages):
            page = pdf[i]
            # Render at 2x scale for better OCR quality
            bitmap = page.render(scale=2)
            pil_image = bitmap.to_pil()
            
            tmp_img_path = f"/tmp/page_{i}.jpg"
            pil_image.save(tmp_img_path, "JPEG")
            image_paths.append(tmp_img_path)

        # 2. Process with AI
        extracted_data = analyze_images_with_gemini(image_paths)

        # 3. Format Response
        final_questions = []
        for q in extracted_data:
            final_questions.append(Question(
                id=str(uuid.uuid4()),
                number=str(q.get("number", "?")),
                type=q.get("type", "text"),
                content=q.get("content", ""),
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
        # Cleanup
        if os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)
        for p in image_paths:
            if os.path.exists(p):
                os.remove(p)

# Vercel requires the app instance to be available
# No changes needed here, uvicorn is for local dev
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)