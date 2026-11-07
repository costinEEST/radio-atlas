"""Extract page-marked PDF text for manual station-source verification."""
import argparse
from pathlib import Path
from pypdf import PdfReader

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('pdf', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
if not args.pdf.read_bytes().startswith(b'%PDF-'):
    parser.error('Input is not a PDF; check for an HTML error or archive wrapper.')
reader = PdfReader(args.pdf)
pages = []
for number, page in enumerate(reader.pages, 1):
    text = page.extract_text(extraction_mode='layout') or ''
    pages.append(f'--- Page {number} ---\n{text}')
args.output.write_text('\n\n'.join(pages) + '\n', encoding='utf-8')
print(f'{len(reader.pages)} pages extracted to {args.output}')
print(f'PDF metadata (not independently verified): {reader.metadata}')
if not any(page.split('\n', 1)[1].strip() for page in pages):
    print('No text extracted: render the PDF and read its images or use OCR, then verify visually.')
