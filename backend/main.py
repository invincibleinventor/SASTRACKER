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
from pdf2image import convert_from_path
from dotenv import load_dotenv

# --- Configuration ---
# Create a .env file with GOOGLE_API_KEY=your_key_here
load_dotenv() 

# Configure Gemini
GENAI_KEY = os.getenv("GOOGLE_API_KEY")
if not GENAI_KEY:
    print("WARNING: GOOGLE_API_KEY not found in environment variables.")

genai.configure(api_key=GENAI_KEY)

# Initialize FastAPI
app = FastAPI(title="Question Paper Extractor API")

# Allow CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class Question(BaseModel):
    id: str
    number: str
    type: str  # text, math, image
    content: str
    isMath: bool
    hasImage: bool
    image_base64: Optional[str] = None # Added to carry the actual cropped image

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
       - If you encounter tabular data, or graphs,  consider them as images as well. 
       - Provide "page_number" (integer, 1-indexed) indicating which page contains the image.
       - Provide "visual_bbox": [ymin, xmin, ymax, xmax] (integers, 0-1000 scale) representing the bounding box of the diagram. Leave some space on all 4 directions.
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

    # Load images for sending to API and for later cropping
    import PIL.Image
    pil_images = [PIL.Image.open(p) for p in image_paths]

    try:
        # We use response_mime_type="application/json" to force valid JSON output
        # This handles the backslash escaping issues automatically in most cases
        response = model.generate_content(
            [prompt, *pil_images],
            generation_config={"response_mime_type": "application/json"}
        )
        
        text_response = response.text
        # Cleanup if model adds markdown fences despite mime_type
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0]
        elif "```" in text_response:
            text_response = text_response.split("```")[1]
            
        data = json.loads(text_response)
        
        # --- Post-Processing: Crop Images ---
        # If Gemini identified an image bbox, we crop it from the original page
        for q in data:
            if q.get('hasImage') and 'visual_bbox' in q and 'page_number' in q:
                try:
                    page_idx = q['page_number'] - 1 # Convert 1-indexed to 0-indexed
                    if 0 <= page_idx < len(pil_images):
                        target_img = pil_images[page_idx]
                        ymin, xmin, ymax, xmax = q['visual_bbox']
                        
                        # Convert 0-1000 scale to pixel coordinates
                        width, height = target_img.size
                        left = xmin * width / 1000
                        top = ymin * height / 1000
                        right = xmax * width / 1000
                        bottom = ymax * height / 1000
                        
                        # Crop the image
                        cropped_img = target_img.crop((left, top, right, bottom))
                        
                        # Convert to Base64
                        buffered = io.BytesIO()
                        cropped_img.save(buffered, format="JPEG")
                        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                        
                        # Add to question object
                        q['image_base64'] = f"data:image/jpeg;base64,{img_str}"
                except Exception as img_err:
                    print(f"Failed to crop image for Q{q.get('number')}: {img_err}")
                    # We continue without the image if cropping fails
        
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

    # 1. Save Upload temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
        tmp_pdf.write(await file.read())
        tmp_pdf_path = tmp_pdf.name

    image_paths = []
    
    try:
        # 2. Convert PDF to Images
        images = convert_from_path(tmp_pdf_path)
        
        for i, img in enumerate(images):
            tmp_img_path = f"temp_page_{i}.jpg"
            img.save(tmp_img_path, "JPEG")
            image_paths.append(tmp_img_path)

        # 3. Process with AI
        extracted_data = analyze_images_with_gemini(image_paths)

        # 4. Format Response
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)