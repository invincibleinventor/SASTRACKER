import os
import json
import uuid
import tempfile
import base64
import io
import urllib.request
import re
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
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

# --- Data Models ---
class ExtractRequest(BaseModel):
    file_url: str

class SolveRequest(BaseModel):
    content: str
    image_url: Optional[str] = None

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

class SolutionResponse(BaseModel):
    solution: str

# --- Helper Functions ---

def analyze_images_with_gemini(image_paths: List[str]) -> List[dict]:
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")

    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Updated Prompt with Smarter Marks Deduction Logic
    prompt = """
    You are an expert exam digitizer. 
    Analyze the provided images of a question paper.
    Extract every single question individually.
    
    Rules:
    1. If a question spans multiple pages, merge it into one.
    2. Identify if the question is primarily text, math, or image-based.
    3. **MARKS EXTRACTION (CRITICAL):**
       - **Check Section Headers:** Marks are often defined at the start of a section (e.g., "Part A - 10 x 2 = 20 Marks", "Answer all questions (5 x 1 = 5)", "Q.No 1-10 carry 1 mark each"). 
       - **Deduce:** If a question does not have explicit marks next to it (e.g., "[5]" or "(2)"), assign the mark value derived from its section header.
       - **Override:** If specific marks are present next to a question text, they override the section default.
       - **Default:** Default to 1 only if absolutely no section or question-level mark info is found.
    4. For Math: Convert expressions to valid LaTeX enclosed in single $...$ for inline or $$...$$ for block. 
       **CRITICAL:** You MUST escape all backslashes in the JSON string. For example, write "\\\\frac" instead of "\\frac", and "\\\\alpha" instead of "\\alpha".
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
        
        try:
            data = json.loads(text_response)
        except json.JSONDecodeError:
            cleaned_response = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', text_response)
            data = json.loads(cleaned_response)
        
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
                    print(f"Failed to crop image: {img_err}")
        return data

    except Exception as e:
        print(f"AI Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Processing Failed: {str(e)}")

# --- Endpoints ---

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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)
        for p in image_paths:
            if os.path.exists(p):
                os.remove(p)

@app.post("/solve", response_model=SolutionResponse)
async def solve_question(request: SolveRequest):
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")
        
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Updated Prompt: HTML for Structure, LaTeX for Math
    prompt = f"""
    You are an expert academic tutor. Provide a comprehensive solution to this question. You always give the easiest and the most straightforward answer without any additional explanation or story. U dont go in any roundabout way to solve a problem. You always give the solution with the simplest and fewest number of steps.

    **Question:**
    {request.content}
    
    **FORMATTING INSTRUCTIONS (CRITICAL):**
    1. **Structure with HTML:**
       - Use `<h3>` for step titles (e.g., <h3>Step 1: Identification</h3>).
       - Use `<p>` for paragraphs.
       - Use `<ul>` and `<li>` for lists.
       - Use `<b>` for bold text and `<i>` for italics.
       - Use `<br>` for line breaks.
    
    2. **Math with LaTeX:**
       - Enclose ALL mathematical expressions in standard LaTeX delimiters:
         - Inline: `$ ... $`
         - Block: `$$...$$`
    
    3. **Tables:**
       - Use standard HTML `<table>`, `<tr>`, `<td>`, `<th>` tags with a `border="1"` attribute for tables (like K-Maps).
       - OR use LaTeX `$$\\begin{{array}}...\\end{{array}}$$` if strictly mathematical.
    
    **Example Output Format:**
    <h3>Step 1: Analysis</h3>
    <p>The function is given by $f(x) = x^2$. We need to find the derivative.</p>
    <ul>
      <li>First, apply the power rule.</li>
      <li>The result is $f'(x) = 2x$.</li>
    </ul>
    """
    
    content_parts = [prompt]
    
    temp_img_path = None
    if request.image_url:
        try:
            temp_img_path = f"/tmp/solve_{uuid.uuid4()}.jpg"
            urllib.request.urlretrieve(request.image_url, temp_img_path)
            img = PIL.Image.open(temp_img_path)
            content_parts.append(img)
        except Exception as e:
            print(f"Failed to download image for solving: {e}")

    try:
        response = model.generate_content(content_parts)
        return {"solution": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Solution Failed: {str(e)}")
    finally:
        if temp_img_path and os.path.exists(temp_img_path):
            os.remove(temp_img_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)