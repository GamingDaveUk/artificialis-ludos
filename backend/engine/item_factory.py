import json
import re
import httpx
import uuid
from pathlib import Path
from PIL import Image, PngImagePlugin

# Setup directories
ASSETS_DIR = Path("assets/images/items")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

class ItemFactory:
    @staticmethod
    async def generate_item(llm_url: str, llm_key: str, model: str, system_prompt: str, user_prompt: str, max_tokens: int = 4096):
        headers = {"Authorization": f"Bearer {llm_key}"} if llm_key else {}

        # --- SINGLE LLM CALL ---
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": max_tokens  # <--- Now it uses the variable
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{llm_url}/chat/completions", json=payload, headers=headers, timeout=120.0)
            response.raise_for_status()
            raw_content = response.json()["choices"][0]["message"].get("content", "")

        # Extract JSON safely by finding the first and last curly braces
        clean_content = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL).strip()

        start_idx = clean_content.find('{')
        end_idx = clean_content.rfind('}')

        if start_idx == -1 or end_idx == -1:
            raise ValueError("LLM did not return a valid JSON object.")

        json_str = clean_content[start_idx:end_idx + 1]
        item_data = json.loads(json_str)

        # Extract the image prompt the LLM generated, or fallback if it hallucinates
        final_image_prompt = item_data.get("image_prompt", f"A highly detailed game icon of {item_data.get('name', 'an item')}.")

        # --- CREATE UNIQUE PNG & EMBED METADATA ---
        # Generate an 8-character unique ID to prevent collisions and URL errors
        unique_id = uuid.uuid4().hex[:8]
        safe_filename = f"item_{unique_id}.png"
        image_path = ASSETS_DIR / safe_filename

        img = Image.new('RGB', (1024, 1024), color='black')

        meta = PngImagePlugin.PngInfo()
        meta.add_text("ludos_item_data", json.dumps(item_data))
        meta.add_text("ludos_image_prompt", final_image_prompt)

        img.save(image_path, "PNG", pnginfo=meta)

        # Force forward slashes for the web URL so Windows doesn't break it
        web_path = str(image_path).replace("\\", "/")

        return {
            "item_data": item_data,
            "image_prompt": final_image_prompt,
            "image_path": web_path
        }
