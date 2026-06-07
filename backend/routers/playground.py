from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import json
import re
from .settings import get_active_config, LLMConfig, PROMPTS_DIR

router = APIRouter(prefix="/api/playground", tags=["Playground"])

class GenerateItemRequest(BaseModel):
    llm_config: LLMConfig
    prompt_file: str
    item_idea: str

@router.post("/generate/item")
async def generate_item(request: GenerateItemRequest):
    actual_url, actual_key, actual_model = get_active_config(request.llm_config)
    if not actual_model:
        raise HTTPException(status_code=400, detail="No model configured in Settings.")

    # 1. Load the requested prompt pack
    filepath = PROMPTS_DIR / request.prompt_file
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Prompt pack not found.")

    with open(filepath, "r") as f:
        prompts = json.load(f)

    # 2. Construct the Prompts
    global_theme = prompts.get("global_theme", "Unknown Theme")
    jailbreak = prompts.get("jailbreak", "")
    item_gen_template = prompts.get("item_generator", "")
    image_gen_template = prompts.get("item_image_gen", "")

    # Inject the user's idea and theme into the template
    system_prompt = f"{jailbreak}\n\n{item_gen_template.replace('{theme}', global_theme)}"
    user_prompt = f"Create the following item: {request.item_idea}"

    # 3. Call the LLM for the Item Data
    headers = {"Authorization": f"Bearer {actual_key}"} if actual_key else {}
    payload = {
        "model": actual_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 1000
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{actual_url}/chat/completions", json=payload, headers=headers, timeout=120.0)
            response.raise_for_status()
            message = response.json()["choices"][0]["message"]
            raw_content = message.get("content", "")

            # Strip thinking tags
            clean_content = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL).strip()

            # Use Regex to extract ONLY the JSON object from the response
            # (Sometimes LLMs ignore the "strict JSON" rule and add "Here is your item: {}")
            json_match = re.search(r'\{.*\}', clean_content, re.DOTALL)
            if not json_match:
                raise ValueError("LLM did not return a valid JSON object.")

            item_json_str = json_match.group(0)
            item_data = json.loads(item_json_str)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Item Generation Failed: {str(e)}")

    # 4. Construct the Image Prompt locally (no second LLM call needed yet)
    # We just inject the generated item's name/desc into the image template
    item_for_image = f"{item_data.get('name')} - {item_data.get('description')}"
    final_image_prompt = image_gen_template.replace("{theme}", global_theme).replace("{item}", item_for_image)

    return {
        "item_data": item_data,
        "image_prompt": final_image_prompt,
        "raw_json_string": item_json_str
    }
