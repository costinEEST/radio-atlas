# Recover and inspect PDF sources

Use this workflow when an official station source is missing or a frequency list is a PDF.

## Recover the newest usable archive capture

1. Try the original URL first. If unavailable, open https://web.archive.org/ and paste that exact URL into its search field.
2. Inspect the available years/dates. Choose the newest saved entry, hover its calendar date, then open or copy the timestamp link. Check that replay contains the intended document, not a saved error page. If the newest capture is unusable, try the next newest and explain the fallback.
3. Preserve both the original URL and the exact timestamped replay URL. Label archived sources and their capture dates in the catalog. A capture date is not a document publication/update date or proof of current transmission. Prefer authoritative, dated evidence when sources disagree; do not automatically prefer a later capture of an older document.
4. Open the replay in Chrome. For downloading the PDF bytes, use the same timestamp with `id_` after it (for example `/web/20260508150354id_/https://…pdf`); this omits Wayback's HTML toolbar. Confirm the payload is a PDF before parsing. Inspect response headers too: Wayback may return HTTP 200 while warning `299 wayback content truncated by "length"`. Compare the received size with any original/crawler length; a successful HTTP transfer can still be an incomplete archived document.

## Download and extract

Keep downloads and extracted files in a temporary directory, outside the repository. Quote URLs because they may contain spaces or shell metacharacters. In a restricted environment, request the needed network/cache permission after a sandbox failure.

```sh
curl -fL --connect-timeout 15 --max-time 1200 'EXACT_PDF_OR_ARCHIVE_RAW_URL' -o /tmp/radio-source.pdf
uv run --no-project --with pypdf python .agents/skills/maintain-radio-atlas/scripts/extract-radio-pdf.py /tmp/radio-source.pdf /tmp/radio-source.txt
```

Inspect curl's exit status. A timed-out download may leave a partial PDF; do not treat it as complete. To resume a slow download, rerun curl with `-C -` and the same URL/output path. Only use the result after a successful transfer and successful parsing. A `%PDF-` header alone does not prove completeness.

The helper extracts layout text with page markers and reports PDF metadata. It does not interpret station facts. Read every relevant page, distinguish FM from AM, and reconcile entries by place/site and frequency rather than line position. Preserve source spelling and qualifiers. Compare parsed counts, duplicates and values against the committed JSON before editing it.

PDFs can have broken character maps, columns, scanned images or missing text. Compare questionable characters and all discrepancies against the rendered PDF in Chrome; use OCR only as a draft. Do not silently replace corrupted glyphs or infer map labels from extraction order. PDF metadata dates also require context.

## Record the result

Keep the chosen capture, source dates, relevant differences and evidence in the station's sources/notes. Keep extraction code here; do not commit temporary PDFs, extracted dumps or one-off reconciliation scripts that duplicate the catalog. If access or extraction remains blocked, state that limitation rather than presenting snippets as a read document.

Known limitation encountered with the RRA Radiocom map: capture `20260508150354` returns 5,242,880 bytes with the truncation warning, while `x-archive-orig-x-crawler-content-length` reports 18,512,513 bytes. Its capture date and HTTP Last-Modified header do not establish the content or publication date of the missing portion. Do not treat the archive toolbar or PDF header as evidence that the map was read.
