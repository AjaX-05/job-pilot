import pdfplumber
import docx
import os
import sys

def parse_pdf(file_path):
    text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text.append(page.extract_text())
    return '\n'.join(text)

def parse_docx(file_path):
    doc = docx.Document(file_path)
    text = []
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():  # Only add non-empty paragraphs
            text.append(paragraph.text)
    return '\n'.join(text)

def parse_resume(file_path):
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    try:
        if ext == '.pdf':
            text = parse_pdf(file_path)
        elif ext in ['.docx', '.doc']:
            text = parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        # Clean up the text
        text = text.strip()
        
        # Save the extracted text
        with open('server/resume_context.txt', 'w', encoding='utf-8') as f:
            f.write(text)

        print("[INFO] Resume parsed successfully")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to parse resume: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("[ERROR] Usage: python parse_resume.py <file_path>")
        sys.exit(1)
    
    success = parse_resume(sys.argv[1])
    if not success:
        sys.exit(1)