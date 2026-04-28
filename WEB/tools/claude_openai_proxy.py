from __future__ import annotations

import json
import os
import time
import uuid
import urllib.error
import urllib.request
from typing import Any, Dict, Iterable, List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse


app = FastAPI(title="Claude Code OpenAI Proxy")


def _now() -> int:
    return int(time.time())


def _error(status_code: int, message: str, type_name: str = "error") -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "type": "error",
            "error": {
                "type": type_name,
                "message": message,
            },
        },
    )


def _get_api_key(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()

    api_key = request.headers.get("x-api-key", "").strip()
    if api_key:
        if api_key.lower().startswith("bearer "):
            return api_key[7:].strip()
        return api_key

    return os.getenv("OPENAI_API_KEY", "").strip()


def _extract_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts: List[str] = []
        for item in value:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(str(item.get("text", "")))
                elif item.get("type") == "tool_result":
                    content = item.get("content")
                    parts.append(_extract_text(content))
            else:
                parts.append(str(item))
        return "\n".join(part for part in parts if part)
    if isinstance(value, dict):
        if value.get("type") == "text":
            return str(value.get("text", ""))
        if value.get("type") == "tool_result":
            return _extract_text(value.get("content"))
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _anthropic_block_to_openai_message(block: Dict[str, Any], tool_messages: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    block_type = block.get("type")
    if block_type == "text":
        text = str(block.get("text", ""))
        if text:
            return {"role": "user", "content": text}
        return None

    if block_type == "tool_result":
        tool_messages.append(
            {
                "role": "tool",
                "tool_call_id": str(block.get("tool_use_id") or block.get("id") or uuid.uuid4().hex),
                "content": _extract_text(block.get("content")),
            }
        )
        return None

    if block_type == "image":
        # Claude Code may include images in some workflows. OpenAI chat completions can accept
        # multimodal content, but keeping the proxy minimal, we skip unsupported blocks here.
        return None

    return None


def _convert_messages(body: Dict[str, Any]) -> List[Dict[str, Any]]:
    messages: List[Dict[str, Any]] = []

    system = body.get("system")
    if system:
        system_text = _extract_text(system)
        if system_text:
            messages.append({"role": "system", "content": system_text})

    for raw_message in body.get("messages", []):
        if not isinstance(raw_message, dict):
            continue

        role = raw_message.get("role")
        content = raw_message.get("content")

        if role == "assistant":
            assistant_message: Dict[str, Any] = {"role": "assistant"}
            tool_calls: List[Dict[str, Any]] = []
            text_parts: List[str] = []

            blocks = content if isinstance(content, list) else ([{"type": "text", "text": content}] if content else [])
            for block in blocks:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "text":
                    text = str(block.get("text", ""))
                    if text:
                        text_parts.append(text)
                elif block.get("type") == "tool_use":
                    tool_name = str(block.get("name", ""))
                    tool_input = block.get("input", {})
                    tool_calls.append(
                        {
                            "id": str(block.get("id") or f"call_{uuid.uuid4().hex}"),
                            "type": "function",
                            "function": {
                                "name": tool_name,
                                "arguments": json.dumps(tool_input, ensure_ascii=False),
                            },
                        }
                    )

            if text_parts:
                assistant_message["content"] = "\n".join(text_parts)
            elif not tool_calls:
                assistant_message["content"] = ""

            if tool_calls:
                assistant_message["tool_calls"] = tool_calls

            messages.append(assistant_message)
            continue

        if role == "user":
            user_text_parts: List[str] = []
            tool_messages: List[Dict[str, Any]] = []

            blocks = content if isinstance(content, list) else ([{"type": "text", "text": content}] if content else [])
            for block in blocks:
                if not isinstance(block, dict):
                    continue
                converted = _anthropic_block_to_openai_message(block, tool_messages)
                if converted is not None:
                    user_text_parts.append(str(converted.get("content", "")))

            if user_text_parts:
                messages.append({"role": "user", "content": "\n".join(part for part in user_text_parts if part)})

            messages.extend(tool_messages)
            continue

    return messages


def _pick_model(body: Dict[str, Any]) -> str:
    requested = str(body.get("model") or "").strip()
    fallback = os.getenv("OPENAI_MODEL", "gpt-5.5").strip() or "gpt-5.5"
    if requested and not requested.startswith("claude-"):
        return requested
    return os.getenv("CLAUDE_PROXY_MODEL", fallback).strip() or fallback


def _anthropic_response_from_openai(choice: Any, model: str, usage: Any) -> Dict[str, Any]:
    content_blocks: List[Dict[str, Any]] = []

    assistant_message = getattr(choice, "message", None)
    if assistant_message is not None:
        text = getattr(assistant_message, "content", None)
        if text:
            content_blocks.append({"type": "text", "text": str(text)})

        tool_calls = getattr(assistant_message, "tool_calls", None) or []
        for tool_call in tool_calls:
            function = getattr(tool_call, "function", None)
            arguments = getattr(function, "arguments", "{}") if function is not None else "{}"
            try:
                parsed_arguments = json.loads(arguments) if isinstance(arguments, str) and arguments else {}
            except json.JSONDecodeError:
                parsed_arguments = {"raw_arguments": arguments}
            content_blocks.append(
                {
                    "type": "tool_use",
                    "id": getattr(tool_call, "id", f"toolu_{uuid.uuid4().hex}"),
                    "name": getattr(function, "name", ""),
                    "input": parsed_arguments,
                }
            )

    stop_reason = "tool_use" if any(block["type"] == "tool_use" for block in content_blocks) else "end_turn"

    return {
        "id": f"msg_{uuid.uuid4().hex}",
        "type": "message",
        "role": "assistant",
        "model": model,
        "content": content_blocks,
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {
            "input_tokens": int(getattr(usage, "prompt_tokens", 0) or 0),
            "output_tokens": int(getattr(usage, "completion_tokens", 0) or 0),
        },
    }


def _anthropic_sse_lines(payload: Dict[str, Any]) -> Iterable[str]:
    yield f"event: message_start\ndata: {json.dumps({'type': 'message_start', 'message': {'id': payload['id'], 'type': 'message', 'role': 'assistant', 'model': payload['model'], 'content': [], 'stop_reason': None, 'stop_sequence': None, 'usage': {'input_tokens': payload['usage']['input_tokens'], 'output_tokens': 0}}}, ensure_ascii=False)}\n\n"

    content_blocks = payload.get("content", [])
    for index, block in enumerate(content_blocks):
        yield f"event: content_block_start\ndata: {json.dumps({'type': 'content_block_start', 'index': index, 'content_block': block}, ensure_ascii=False)}\n\n"
        if block.get("type") == "text":
            text = str(block.get("text", ""))
            if text:
                yield f"event: content_block_delta\ndata: {json.dumps({'type': 'content_block_delta', 'index': index, 'delta': {'type': 'text_delta', 'text': text}}, ensure_ascii=False)}\n\n"
        elif block.get("type") == "tool_use":
            yield f"event: content_block_delta\ndata: {json.dumps({'type': 'content_block_delta', 'index': index, 'delta': {'type': 'input_json_delta', 'partial_json': json.dumps(block.get('input', {}), ensure_ascii=False)}}, ensure_ascii=False)}\n\n"
        yield f"event: content_block_stop\ndata: {json.dumps({'type': 'content_block_stop', 'index': index}, ensure_ascii=False)}\n\n"

    yield f"event: message_delta\ndata: {json.dumps({'type': 'message_delta', 'delta': {'stop_reason': payload['stop_reason'], 'stop_sequence': None}, 'usage': {'output_tokens': payload['usage']['output_tokens']}}, ensure_ascii=False)}\n\n"
    yield f"event: message_stop\ndata: {json.dumps({'type': 'message_stop'}, ensure_ascii=False)}\n\n"


@app.get("/")
async def root() -> Dict[str, Any]:
    return {"status": "ok", "service": "claude-openai-proxy"}


@app.get("/v1/models")
async def list_models() -> Dict[str, Any]:
    model_name = os.getenv("CLAUDE_PROXY_MODEL", os.getenv("OPENAI_MODEL", "gpt-5.5"))
    return {
        "type": "list",
        "data": [
            {
                "id": model_name,
                "type": "model",
                "created": _now(),
                "owned_by": "openai",
            }
        ],
    }


@app.post("/v1/messages")
async def messages(request: Request):
    api_key = _get_api_key(request)
    if not api_key:
        return _error(401, "Missing OpenAI API key in Authorization or X-API-Key header.", "authentication_error")

    try:
        body = await request.json()
    except Exception:
        return _error(400, "Invalid JSON body.", "invalid_request_error")

    model = _pick_model(body)
    openai_messages = _convert_messages(body)
    if not openai_messages:
        openai_messages = [{"role": "user", "content": ""}]

    tools = []
    for tool in body.get("tools", []):
        if not isinstance(tool, dict):
            continue
        name = str(tool.get("name", ""))
        schema = tool.get("input_schema") or tool.get("parameters") or {"type": "object", "properties": {}}
        if name:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": name,
                        "description": str(tool.get("description", "")),
                        "parameters": schema,
                    },
                }
            )

    stream = bool(body.get("stream", False))

    try:
        upstream_base_url = os.getenv("OPENAI_BASE_URL", "http://127.0.0.1:24049/v1").strip().rstrip("/")
        upstream_payload: Dict[str, Any] = {
            "model": model,
            "messages": openai_messages,
            "max_tokens": body.get("max_tokens"),
            "stream": False,
        }
        if tools:
            upstream_payload["tools"] = tools
            upstream_payload["tool_choice"] = "auto"
        if body.get("temperature") is not None:
            upstream_payload["temperature"] = body.get("temperature")
        if body.get("top_p") is not None:
            upstream_payload["top_p"] = body.get("top_p")

        req = urllib.request.Request(
            url=f"{upstream_base_url}/chat/completions",
            data=json.dumps(upstream_payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as response:
            completion = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        print(f"UPSTREAM ERROR: {exc!r}", flush=True)
        return _error(502, f"OpenAI request failed: {exc}", "api_error")

    choice = completion["choices"][0]
    usage = type("Usage", (), completion.get("usage", {}))()
    payload = _anthropic_response_from_openai(
        type("Choice", (), {"message": type("Message", (), choice.get("message", {}))()})(),
        model=completion.get("model") or model,
        usage=usage,
    )

    if not stream:
        return JSONResponse(content=payload)

    async def event_generator():
        for line in _anthropic_sse_lines(payload):
            yield line

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/v1/models/{model_id}")
async def model_detail(model_id: str) -> Dict[str, Any]:
    return {
        "id": model_id,
        "type": "model",
        "created": _now(),
        "owned_by": "openai",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)