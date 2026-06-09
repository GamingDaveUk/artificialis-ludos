from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from pathlib import Path

from ..database import SessionLocal
from ..models import Item
from ..engine.item_factory import ItemFactory
from .settings import get_active_config, LLMConfig, PROMPTS_DIR
import os

router = APIRouter(prefix="/api/playground", tags=["Playground"])

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class GenerateItemRequest(BaseModel):
    llm_config: LLMConfig
    prompt_file: str
    item_idea: str
    lore_context: Optional[str] = ""
    override_item_prompt: Optional[str] = ""
    override_image_prompt: Optional[str] = ""


class UpdateItemRequest(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    equip_slot: Optional[str] = None
    stats: Optional[dict] = None
    description: Optional[str] = None
    value: Optional[int] = None
    modifications: Optional[list] = None

@router.post("/generate/item")
async def generate_playground_item(request: GenerateItemRequest, db: Session = Depends(get_db)):
    actual_url, actual_key, actual_model = get_active_config(request.llm_config)
    if not actual_model:
        raise HTTPException(status_code=400, detail="No model configured in Settings.")

    filepath = PROMPTS_DIR / request.prompt_file
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Prompt pack not found.")

    with open(filepath, "r") as f:
        prompts = json.load(f)

    global_theme = prompts.get("global_theme", "Unknown Theme")
    jailbreak = prompts.get("jailbreak", "")

    item_gen_template = request.override_item_prompt if request.override_item_prompt else prompts.get("item_generator", "")
    image_gen_template = request.override_image_prompt if request.override_image_prompt else prompts.get("item_image_gen", "")

    # CONCATENATE THE PROMPTS INTO ONE INSTRUCTION SET
    system_prompt = f"{jailbreak}\n\n{item_gen_template.replace('{theme}', global_theme)}\n\n{image_gen_template}"
    user_prompt = f"Create the following item: {request.item_idea}\nContext/Lore: {request.lore_context}"

    # Grab max_tokens from your config.json, default to 4096 if it fails
    actual_max_tokens = 4096
    config_path = Path("config.json")
    if config_path.exists():
        try:
            with open(config_path, "r") as cf:
                server_config = json.load(cf)
                # Navigating the advanced_params dictionary
                actual_max_tokens = server_config.get("advanced_params", {}).get("max_tokens", {}).get("value", 4096)
        except Exception:
            pass

    try:
        result = await ItemFactory.generate_item(
            llm_url=actual_url,
            llm_key=actual_key,
            model=actual_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=actual_max_tokens # <--- Passed dynamically
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    item_data = result["item_data"]

    new_item = Item(
        name=item_data.get("name", "Unknown"),
        type=item_data.get("type", "Unknown"),
        equip_slot=item_data.get("equip_slot", "None"),
        stats=item_data.get("stats", {}),
        description=item_data.get("description", ""),
        value=item_data.get("value", 0),
        modifications=item_data.get("modifications", []),
        image_url=result["image_path"],
        image_prompt=result["image_prompt"],
        origin_tag="playground"
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item

@router.get("/items")
async def get_playground_items(db: Session = Depends(get_db)):
    # Fetch only items created in the playground
    items = db.query(Item).filter(Item.origin_tag == "playground").all()
    return items

@router.delete("/items/{item_id}")
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Optionally delete the image file from the disk here as well
    if item.image_url:
        img_file = Path(item.image_url)
        if img_file.exists():
            img_file.unlink()

    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}


@router.put("/items/{item_id}")
async def update_item(item_id: int, request: UpdateItemRequest, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if request.name is not None:
        item.name = request.name
    if request.type is not None:
        item.type = request.type
    if request.equip_slot is not None:
        item.equip_slot = request.equip_slot
    if request.stats is not None:
        # Validate that all values are numbers or strings
        for key, val in request.stats.items():
            if not isinstance(val, (int, float, str)):
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid stat value for '{key}': must be a number or string, got {type(val).__name__}"
                )
        item.stats = request.stats
    if request.description is not None:
        item.description = request.description
    if request.value is not None:
        item.value = request.value
    if request.modifications is not None:
        item.modifications = request.modifications

    db.commit()
    db.refresh(item)
    return item
