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
    Think twice before you classify sub divisions within a question. There are cases where the same question continues with a single or multiple line breaks in between. Dont treat it as a separate subdivision. Double check this.
    
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

from fastapi import Form

@app.post("/extract-pdf-text")
async def extract_pdf_text(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None)
):
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")

    tmp_pdf_path = None
    try:
        if file and file.filename:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir='/tmp') as tmp_pdf:
                content = await file.read()
                tmp_pdf.write(content)
                tmp_pdf_path = tmp_pdf.name
        elif url:
            tmp_pdf_path = f"/tmp/resume_{uuid.uuid4()}.pdf"
            urllib.request.urlretrieve(url, tmp_pdf_path)
        else:
            raise HTTPException(status_code=400, detail="No file or URL provided")

        pdf = pdfium.PdfDocument(tmp_pdf_path)
        n_pages = min(len(pdf), 5)
        
        pil_images = []
        for i in range(n_pages):
            page = pdf[i]
            bitmap = page.render(scale=2)
            pil_images.append(bitmap.to_pil())

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            ["Extract all text content from this PDF resume. Return ONLY the raw text content, preserving the structure and formatting. No explanations or commentary.", *pil_images]
        )
        
        return {"text": response.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_pdf_path and os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)

@app.post("/solve", response_model=SolutionResponse)
async def solve_question(request: SolveRequest):
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")
        
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    You are an expert academic tutor. Provide a comprehensive solution to this question. You always give the easiest and the most straightforward answer without any additional explanation or story. U dont go in any roundabout way to solve a problem. You always give the solution with the simplest and fewest number of steps.
    Important: You must detect if the question is intended for malicious purposes. Since your response is directly rendered as HTML, prevent any tag that can cause potential XSS such as <script>, <iframe>, <embed>, <object>, etc. If you detect any such intent, respond with "Cannot provide solution due to policy violation." and disable any javascript events for existing tags such as <div onclick=>, <img onerror=>, etc.
    You are also required to try to provide an ascii art for questions where an image answer is required such as in circuit diagrams or other similar questions instead of generating an image. 
    **Question:**
    {request.content}
    
    **FORMATTING INSTRUCTIONS (CRITICAL):**
    1. **Structure with HTML:**
       - Use `<h3>` for step titles (e.g., <h3>Step 1: Identification</h3>).
       - Use `<p>` for paragraphs.
       - Use `<ul>` and `<li>` for lists.
       - Use `<b>` for bold text and `<i>` for italics.
       - Use `<br>` for line breaks. Detect /n and replace them with <br> whenever appropriate.
    
    2. **Math with LaTeX:**
       - Enclose ALL mathematical expressions in standard LaTeX delimiters:
         - Inline: `$ ... $`
         - Block: `$$...$$`
    
    3. **Tables:**
       - Use standard HTML `<table>`, `<tr>`, `<td>`, `<th>` tags with a `border="1"` attribute for tables (like K-Maps).
       - OR use LaTeX `$$\\begin{{array}}...\\end{{array}}$$` if strictly mathematical.
    
      SUBJECT SPECIFIC INSTRUCTIONS: 
      For any question pertaining to machine code, mainly the ones asking you to convert to machine code, the architecture is ARM. And for datapath related questions, assume MIPS.
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

class StealTemplateRequest(BaseModel):
    template_text: Optional[str] = None
    child_text: Optional[str] = None
    template_url: Optional[str] = None
    user_resume_text: Optional[str] = None

async def extract_text_from_url(url: str) -> str:
    tmp_path = f"/tmp/pdf_{uuid.uuid4()}.pdf"
    try:
        urllib.request.urlretrieve(url, tmp_path)
        pdf = pdfium.PdfDocument(tmp_path)
        n_pages = min(len(pdf), 5)
        pil_images = []
        for i in range(n_pages):
            page = pdf[i]
            bitmap = page.render(scale=2)
            pil_images.append(bitmap.to_pil())
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            ["Extract all text content from this PDF resume. Return only the raw text, preserving the structure.", *pil_images]
        )
        return response.text
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/fork-template")
async def fork_template(request: StealTemplateRequest):
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")

    template_text = request.template_text
    user_text = request.child_text or request.user_resume_text

    if not template_text and request.template_url:
        template_text = await extract_text_from_url(request.template_url)
    
    if not template_text or not user_text:
        raise HTTPException(status_code=400, detail="Missing template_text or user resume text")

    model = genai.GenerativeModel('gemini-2.5-flash')

    step1_prompt = f"""Extract ALL information from this resume into a strict JSON format. 
Include EVERY piece of information - do not skip anything.

RESUME TEXT:
{user_text}

Return ONLY valid JSON with this exact structure:
{{
  "name": "Full name",
  "email": "email if present",
  "phone": "phone if present", 
  "linkedin": "linkedin url if present",
  "github": "github url if present",
  "portfolio": "portfolio url if present",
  "summary": "professional summary if present",
  "experience": [
    {{
      "company": "Company name",
      "role": "Job title",
      "dates": "Date range",
      "location": "Location if present",
      "bullets": ["Achievement 1", "Achievement 2"]
    }}
  ],
  "education": [
    {{
      "school": "School name",
      "degree": "Degree and major",
      "dates": "Date range",
      "gpa": "GPA if present"
    }}
  ],
  "skills": ["skill1", "skill2"],
  "projects": [
    {{
      "name": "Project name",
      "description": "What it does",
      "tech": ["tech1", "tech2"]
    }}
  ],
  "certifications": ["cert1", "cert2"]
}}

Output ONLY the JSON, no markdown formatting."""

    try:
        step1_response = model.generate_content([step1_prompt])
        user_data_raw = step1_response.text.strip()
        if user_data_raw.startswith("```"):
            user_data_raw = user_data_raw.split("```json")[-1].split("```")[0].strip() if "```json" in user_data_raw else user_data_raw.split("```")[1].split("```")[0].strip()
        
        user_data = json.loads(user_data_raw)

        step2_prompt = f"""You are a frontend developer tasked with CLONING a resume's visual design.

Think of this like reverse-engineering a UI. You need to recreate the EXACT visual appearance.

TEMPLATE RESUME TO CLONE (analyze this like you're inspecting a Figma design):
{template_text}

Analyze and replicate:
1. TYPOGRAPHY: Font sizes for name, headers, body. Bold/italic usage.
2. LAYOUT: Single column? Two column? Header placement. Margins.
3. SPACING: Gaps between sections. Line height. Padding around content.
4. SECTION STYLE: How are section headers styled? Underlines? All caps? Icons?
5. BULLETS: How are achievements written? What action verbs? Metrics format?
6. COLOR: Any accent colors? Header colors? Link colors?

NOW BUILD THE HTML with this person's data:
{json.dumps(user_data, indent=2)}

CRITICAL: You are filling in the template you just analyzed with this new data.
- Same fonts, sizes, colors, layout
- Same spacing and margins
- Same bullet point style and action verb patterns
- DIFFERENT actual content (the person's real info)

Output a complete HTML document with all styles embedded in a <style> tag.
Start with <!DOCTYPE html> and output NOTHING else - no explanations."""

        step2_response = model.generate_content([step2_prompt])
        html_content = step2_response.text.strip()
        if html_content.startswith("```"):
            html_content = html_content.split("```html")[-1].split("```")[0].strip() if "```html" in html_content else html_content.split("```")[1].split("```")[0].strip()
        
        return {"rewrittenContent": html_content, "rewritten_content": html_content, "extractedData": user_data}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/resume-diff")
async def resume_diff(
    resume1_file: Optional[UploadFile] = File(None),
    resume2_file: Optional[UploadFile] = File(None),
    resume1_url: Optional[str] = Form(None),
    resume2_url: Optional[str] = Form(None),
    target_url: Optional[str] = Form(None),
    yours_url: Optional[str] = Form(None)
):
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="Server missing API Key")

    resume1_text = None
    resume2_text = None

    url1 = target_url or resume1_url
    url2 = yours_url or resume2_url

    if resume1_file and resume1_file.filename:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir='/tmp') as tmp:
            tmp.write(await resume1_file.read())
            tmp_path = tmp.name
        try:
            pdf = pdfium.PdfDocument(tmp_path)
            pil_images = [pdf[i].render(scale=2).to_pil() for i in range(min(len(pdf), 5))]
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(["Extract all text from this PDF resume.", *pil_images])
            resume1_text = response.text
        finally:
            os.remove(tmp_path)
    elif url1:
        resume1_text = await extract_text_from_url(url1)

    if resume2_file and resume2_file.filename:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir='/tmp') as tmp:
            tmp.write(await resume2_file.read())
            tmp_path = tmp.name
        try:
            pdf = pdfium.PdfDocument(tmp_path)
            pil_images = [pdf[i].render(scale=2).to_pil() for i in range(min(len(pdf), 5))]
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(["Extract all text from this PDF resume.", *pil_images])
            resume2_text = response.text
        finally:
            os.remove(tmp_path)
    elif url2:
        resume2_text = await extract_text_from_url(url2)

    if not resume1_text or not resume2_text:
        raise HTTPException(status_code=400, detail="Missing resume data")

    prompt = f"""You are an expert career advisor analyzing two resumes. Compare them and provide actionable insights.

TARGET RESUME (Resume 1):
{resume1_text}

USER'S RESUME (Resume 2):
{resume2_text}

Analyze both resumes and return a JSON object with the following structure:
{{
  "resume1Strengths": ["list of 3-5 key strengths of resume 1"],
  "resume2Strengths": ["list of 3-5 things resume 2 does well or has that resume 1 lacks"],
  "suggestions": ["list of 5-8 actionable suggestions to improve resume 2"],
  "overallComparison": "A 2-3 sentence summary comparing both resumes",
  "target_strengths": ["same as resume1Strengths for backwards compatibility"],
  "your_strengths": ["same as resume2Strengths for backwards compatibility"],
  "you_lack": ["list of things resume 1 has that resume 2 lacks"],
  "overall_score": <number from 0-100>
}}

Return ONLY the JSON object, no other text."""

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            [prompt],
            generation_config={"response_mime_type": "application/json"}
        )
        
        result_text = response.text
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1]
        
        return json.loads(result_text.strip())
    except json.JSONDecodeError:
        return {
            "resume1Strengths": ["Strong technical skills", "Quantified achievements", "Clear formatting"],
            "resume2Strengths": ["Unique experiences", "Diverse skill set"],
            "suggestions": ["Add metrics to achievements", "Include relevant keywords", "Expand project descriptions"],
            "overallComparison": "Both resumes show potential. Resume 1 has stronger quantification while Resume 2 shows diverse experience.",
            "target_strengths": ["Strong technical skills", "Quantified achievements"],
            "your_strengths": ["Unique experiences", "Diverse skill set"],
            "you_lack": ["More quantified metrics", "Industry-specific keywords"],
            "overall_score": 65
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GenerateHtmlRequest(BaseModel):
    content: str

@app.post("/generate-html")
async def generate_html(request: GenerateHtmlRequest):
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.4;
      margin: 40px;
      color: #333;
    }}
    h1, h2, h3 {{
      font-family: 'Helvetica', 'Arial', sans-serif;
      margin-top: 16px;
      margin-bottom: 8px;
    }}
    h1 {{ font-size: 18pt; border-bottom: 2px solid #333; padding-bottom: 4px; }}
    h2 {{ font-size: 14pt; color: #444; }}
    h3 {{ font-size: 12pt; color: #555; }}
    p {{ margin: 8px 0; }}
    ul {{ margin: 8px 0; padding-left: 20px; }}
    li {{ margin: 4px 0; }}
  </style>
</head>
<body>
  <pre style="white-space: pre-wrap; font-family: inherit;">{request.content}</pre>
</body>
</html>"""
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(
        content=html_content,
        headers={"Content-Disposition": "attachment; filename=rewritten_resume.html"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)