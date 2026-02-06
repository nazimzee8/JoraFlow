# Validation Checklist

- All API requests validated with Zod schema.
- Reject unknown fields by default.
- Sanitize HTML snippets using `dompurify` before rendering.
- Ensure UTF-8 normalization of input text.
- Validate sender domain format before MX lookup.
