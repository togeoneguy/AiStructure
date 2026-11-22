# AiStructure

AI-assisted 3D scene builder. AiStructure is a browser interface for designing scenes with an AI model and inspecting/exporting geometry in Three.js.

## Run

Static demo:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Free API

Configure a backend rather than exposing API secrets in the browser:

- OpenRouter free models: `https://openrouter.ai/api/v1/chat/completions`
- Hugging Face Router: `https://router.huggingface.co/v1/chat/completions`

Set secrets in server environment variables. Do not commit `.env` files.

## Security

- Never place provider API keys in frontend code
- Use server-side origin validation and rate limiting
- Keep CSP enabled
- Validate and cap prompts before forwarding
- Use authentication for production deployments
