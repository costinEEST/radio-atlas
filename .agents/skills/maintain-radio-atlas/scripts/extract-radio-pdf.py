#!/usr/bin/env python3
"""Extract page-marked PDF text for manual station-source verification."""

import argparse
from pathlib import Path

from pypdf import PdfReader


def extract_pdf(pdf: Path, output: Path) -> None:
    """Extract layout text without interpreting or verifying station facts."""
    with pdf.open('rb') as source:
        if source.read(5) != b'%PDF-':
            raise ValueError('Input is not a PDF; check for an HTML error or archive wrapper.')
        source.seek(0)
        reader = PdfReader(source)
        texts = [page.extract_text(extraction_mode='layout') or '' for page in reader.pages]
        metadata = reader.metadata
    pages = [f'--- Page {number} ---\n{text}' for number, text in enumerate(texts, 1)]
    output.write_text('\n\n'.join(pages) + '\n', encoding='utf-8')
    print(f'{len(pages)} pages extracted to {output}')
    print(f'PDF metadata (not independently verified): {metadata}')
    if not any(text.strip() for text in texts):
        print('No text extracted: render the PDF and read its images or use OCR, then verify visually.')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    try:
        if args.pdf.resolve() == args.output.resolve():
            raise ValueError('Input and output paths must differ.')
        extract_pdf(args.pdf, args.output)
    except (OSError, ValueError) as error:
        parser.exit(1, f'PDF extraction failed: {error}\n')


if __name__ == '__main__':
    main()
