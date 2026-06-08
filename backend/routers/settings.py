from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import httpx
import json
import re
from pathlib import Path

router = APIRouter(prefix="/api/settings", tags=["Settings"])

# ==========================================
# --- Server Configuration Logic ---
# ==========================================
CONFIG_FILE = Path("config.json")

DEFAULT_CONFIG = {
    "url": "",
    # Notice: api_key is completely gone from here!
    "selected_model": "",
    "override_model": "",
    "debug_mode": False,
    "advanced_params": {
        "temperature": {"enabled": True, "value": 0.8},
        "max_tokens": {"enabled": True, "value": 16384},
        "context_length": {"enabled": True, "value": 32768},
        "top_p": {"enabled": False, "value": 1.0},
        "top_k": {"enabled": False, "value": 40},
        "repetition_penalty": {"enabled": False, "value": 1.1},
        "presence_penalty": {"enabled": False, "value": 0.0},
        "frequency_penalty": {"enabled": False, "value": 0.0}
    }
}

# Create default config if missing
if not CONFIG_FILE.exists():
    with open(CONFIG_FILE, "w") as f:
        json.dump(DEFAULT_CONFIG, f, indent=4)

@router.get("/config")
async def get_config():
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to read server config")

@router.post("/config")
async def save_config(config_data: dict):
    try:
        # SECURITY STRIP: Actively delete the api_key if the frontend accidentally sends it
        if "api_key" in config_data:
            del config_data["api_key"]

        with open(CONFIG_FILE, "w") as f:
            json.dump(config_data, f, indent=4)
        return {"message": "Configuration permanently saved to server."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save server config")

# ==========================================
# --- LLM Connection Logic ---
# ==========================================
class LLMConfig(BaseModel):
    url: Optional[str] = ""
    api_key: Optional[str] = ""
    model: Optional[str] = ""
    override_model: Optional[str] = ""
    advanced_params: Optional[Dict[str, Any]] = {}
    debug: Optional[bool] = False

def get_active_config(config: LLMConfig):
    # Load the server config file
    server_config = {}
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                server_config = json.load(f)
        except:
            pass

    # Cascade 1: URL
    actual_url = config.url or server_config.get("url") or os.getenv("DEFAULT_LLM_URL", "")
    if actual_url.endswith("/"): actual_url = actual_url[:-1]

    # Cascade 2: API Key
    actual_key = config.api_key or server_config.get("api_key") or os.getenv("DEFAULT_LLM_API_KEY", "")

    # Cascade 3: Model
    req_model = config.override_model or config.model
    server_model = server_config.get("override_model") or server_config.get("selected_model")
    actual_model = req_model or server_model or ""

    return actual_url, actual_key, actual_model

@router.post("/llm/models")
async def fetch_models(config: LLMConfig):
    actual_url, actual_key, _ = get_active_config(config)
    if not actual_url: raise HTTPException(status_code=400, detail="No LLM URL configured.")
    headers = {"Authorization": f"Bearer {actual_key}"} if actual_key else {}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{actual_url}/models", headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return {"models": [m["id"] for m in data.get("data", [])]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/llm/test")
async def test_llm(config: LLMConfig):
    actual_url, actual_key, actual_model = get_active_config(config)
    if not actual_model: raise HTTPException(status_code=400, detail="No model selected.")
    headers = {"Authorization": f"Bearer {actual_key}"} if actual_key else {}

    payload = {
        "model": actual_model,
        "messages": [{"role": "user", "content": "You are being asked if you exist, create a funny sentence confirming you are alive, be witty, be sarcastic"}]
    }

    if config.advanced_params:
        for key, value in config.advanced_params.items():
            payload[key] = value

    if "max_tokens" not in payload: payload["max_tokens"] = 200

    if config.debug:
        print("\n=== [BACKEND DEBUG: LLM REQUEST PAYLOAD] ===")
        print(f"Target URL: {actual_url}/chat/completions")
        print(json.dumps(payload, indent=2))
        print("============================================\n")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{actual_url}/chat/completions", json=payload, headers=headers, timeout=60.0)
            response.raise_for_status()
            response_data = response.json()

            if config.debug:
                print("\n=== [BACKEND DEBUG: RAW LLM RESPONSE] ===")
                print(json.dumps(response_data, indent=2))
                print("=========================================\n")

            message = response_data["choices"][0]["message"]
            raw_content = message.get("content") or ""
            clean_content = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL).strip()

            if not clean_content: clean_content = raw_content.strip()
            if not clean_content: clean_content = "[SYSTEM WARNING: The LLM connection succeeded, but the AI returned an entirely blank message.]"

            return {"reply": clean_content}

    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# --- Prompt File Logic ---
# ==========================================
PROMPTS_DIR = Path("prompts")
PROMPTS_DIR.mkdir(exist_ok=True)

class PromptData(BaseModel):
    filename: str
    content: dict

@router.get("/prompts/files")
async def list_prompt_files():
    files = [f.name for f in PROMPTS_DIR.glob("*.json")]
    return {"files": files}

@router.get("/prompts/load/{filename}")
async def load_prompt(filename: str):
    filepath = PROMPTS_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail=f"File {filename} not found.")
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"File {filename} is corrupted or not valid JSON.")

@router.post("/prompts/save")
async def save_prompt(data: PromptData):
    if data.filename.lower() == "default.json":
        raise HTTPException(status_code=403, detail="Cannot overwrite default.json. Please choose a new name.")
    filename = data.filename if data.filename.endswith(".json") else f"{data.filename}.json"
    filepath = PROMPTS_DIR / filename
    with open(filepath, "w") as f:
        json.dump(data.content, f, indent=4)
    return {"message": f"Saved {filename} successfully."}
