from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from .database import Base

class WorldSession(Base):
    __tablename__ = "worlds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    global_rules = Column(Text, nullable=True)
    nsfw_enabled = Column(Boolean, default=False) # The master toggle

    # Relationships map the world to everything inside it
    player = relationship("Player", back_populates="world", uselist=False, cascade="all, delete-orphan")
    locations = relationship("Location", back_populates="world", cascade="all, delete-orphan")
    npcs = relationship("NPC", back_populates="world", cascade="all, delete-orphan")
    items = relationship("Item", back_populates="world", cascade="all, delete-orphan")

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    world_id = Column(Integer, ForeignKey("worlds.id"))
    current_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    name = Column(String, index=True)
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)

    physical_description = Column(Text)
    clothing_and_armor = Column(Text)

    # Store dynamic data as JSON dictionaries
    stats = Column(JSON, default={})
    perks_and_skills = Column(JSON, default=[])

    image_prompt = Column(Text) # Used by ComfyUI
    image_url = Column(String, nullable=True)
    origin_tag = Column(String, index=True, default="playground") # Engine tracking

    world = relationship("WorldSession", back_populates="player")

class NPC(Base):
    __tablename__ = "npcs"

    id = Column(Integer, primary_key=True, index=True)
    world_id = Column(Integer, ForeignKey("worlds.id"))
    current_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    name = Column(String, index=True)
    type = Column(String) # e.g., "Enemy", "Merchant", "Companion", "Pet"

    physical_description = Column(Text)
    clothing_and_armor = Column(Text)
    attitude_to_player = Column(String) # e.g., "Hostile", "Friendly", "Terrified"

    stats_and_skills = Column(JSON, default={})
    relationships = Column(JSON, default={}) # e.g., {"Guard Captain": "Hates", "Bob": "Brother"}

    image_prompt = Column(Text)
    image_url = Column(String, nullable=True)
    origin_tag = Column(String, index=True, default="playground") # Engine tracking
    is_alive = Column(Boolean, default=True)

    world = relationship("WorldSession", back_populates="npcs")

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    world_id = Column(Integer, ForeignKey("worlds.id"))

    # Who holds it? If both are null, it's just on the ground.
    owner_player_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    owner_npc_id = Column(Integer, ForeignKey("npcs.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    name = Column(String, index=True)
    type = Column(String) # e.g., "Weapon", "Armor", "Consumable", "Trinket"
    equip_slot = Column(String, nullable=True) # e.g., "Torso", "Head", "None"
    description = Column(Text) # The DCC-style funny paragraph
    value = Column(Integer, default=0)

    stats = Column(JSON, default={}) # e.g., {"armor": 2, "festive_cheer": 1}
    modifications = Column(JSON, default=[]) # e.g., ["Scope", "Extended Mag"]

    image_prompt = Column(Text)
    image_url = Column(String, nullable=True)
    origin_tag = Column(String, index=True, default="playground") # Engine tracking

    world = relationship("WorldSession", back_populates="items")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    world_id = Column(Integer, ForeignKey("worlds.id"))

    name = Column(String, index=True)
    description = Column(Text)
    difficulty_level = Column(Integer, default=1)
    is_player_owned = Column(Boolean, default=False) # Base building!

    connected_locations = Column(JSON, default=[]) # IDs of adjacent rooms/zones

    image_prompt = Column(Text)
    image_url = Column(String, nullable=True)
    origin_tag = Column(String, index=True, default="playground") # Engine tracking
    is_discovered = Column(Boolean, default=False)

    world = relationship("WorldSession", back_populates="locations")
