import { useState, useEffect } from 'react';

interface Item {
    id: number;
    name: string;
    type: string;
    equip_slot: string;
    stats: Record<string, number | string>;
    description: string;
    value: number;
    modifications: string[];
    image_url: string;
    image_prompt: string;
    origin_tag: string;
}

export default function Playground({ setCurrentView }: any) {
    // --- Global Playground State ---
    const [activeTab, setActiveTab] = useState<'ITEMS' | 'NPCS' | 'LOCATIONS'>('ITEMS');

    // --- Item Generation State ---
    const [itemIdea, setItemIdea] = useState('');
    const [loreContext, setLoreContext] = useState('');
    const [overrideItemPrompt, setOverrideItemPrompt] = useState('');
    const [overrideImagePrompt, setOverrideImagePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // --- Database Browser State ---
    const [items, setItems] = useState<Item[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeItem, setActiveItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchDefaults = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/settings/prompts/load/default.json');
                if (res.ok) {
                    const data = await res.json();
                    setOverrideItemPrompt(data.item_generator || '');
                    setOverrideImagePrompt(data.item_image_gen || '');
                }
            } catch (err) { console.error("Failed to load default prompts", err); }
        };
        fetchItems();
        fetchDefaults();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/playground/items');
            if (res.ok) {
                const data = await res.json();
                setItems(data);
                if (data.length > 0) {
                    setActiveItem(data[data.length - 1]);
                    setCurrentIndex(data.length - 1);
                } else {
                    setActiveItem(null);
                }
            }
        } catch (err) { console.error("Failed to fetch items", err); }
    };

    const handleGenerateItem = async () => {
        if (!itemIdea) return alert("You must provide an Item Idea.");
        setIsGenerating(true);

        const payload = {
            llm_config: {},
            prompt_file: "default.json",
            item_idea: itemIdea,
            lore_context: loreContext,
            override_item_prompt: overrideItemPrompt,
            override_image_prompt: overrideImagePrompt
        };

        try {
            const res = await fetch('http://localhost:8000/api/playground/generate/item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const newItem = await res.json();
            if (!res.ok) throw new Error(newItem.detail);

            // Re-fetch default config so the override boxes reset
            const promptRes = await fetch('http://localhost:8000/api/settings/prompts/load/default.json');
            if (promptRes.ok) {
                const pData = await promptRes.json();
                setOverrideItemPrompt(pData.item_generator || '');
                setOverrideImagePrompt(pData.item_image_gen || '');
            }

            await fetchItems();
        } catch (err: any) {
            alert(`Generation Failed: ${err.message}`);
        }
        setIsGenerating(false);
    };

    const handleDeleteItem = async () => {
        if (!activeItem) return;
        if (!window.confirm(`Delete ${activeItem.name}?`)) return;
        try {
            const res = await fetch(`http://localhost:8000/api/playground/items/${activeItem.id}`, { method: 'DELETE' });
            if (res.ok) await fetchItems();
        } catch (err) { console.error(err); }
    };

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setActiveItem(items[currentIndex + 1]);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setActiveItem(items[currentIndex - 1]);
        }
    };

    const handleEditChange = (field: keyof Item, value: any) => {
        if (activeItem) setActiveItem({ ...activeItem, [field]: value });
    };

    return (
        <div className="max-w-7xl mx-auto w-full animate-fade-in pb-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-emerald-900 pb-4">
        <h2 className="text-3xl font-bold text-emerald-500">The Forge Playground</h2>
        <button onClick={() => setCurrentView('MENU')} className="text-neutral-400 hover:text-white transition-colors">[ Return to Menu ]</button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-neutral-800">
        {['ITEMS', 'NPCS', 'LOCATIONS'].map((tab) => (
            <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            >
            {tab} {tab !== 'ITEMS' && '(WIP)'}
            </button>
        ))}
        </div>

        {/* ITEMS TAB */}
        {activeTab === 'ITEMS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">

            {/* LEFT COLUMN: INPUTS */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col space-y-4 shadow-xl">
            <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-widest border-b border-neutral-800 pb-2">Item Parameters</h3>

            <div>
            <label className="text-xs font-bold text-neutral-400 uppercase">Item Idea (What is it?)</label>
            <input type="text" value={itemIdea} onChange={(e) => setItemIdea(e.target.value)} placeholder="e.g., A 3-sleeved Christmas Jumper" className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm mt-1 focus:border-emerald-500 focus:outline-none" />
            </div>

            <div>
            <label className="text-xs font-bold text-neutral-400 uppercase">Context / Lore</label>
            <textarea value={loreContext} onChange={(e) => setLoreContext(e.target.value)} placeholder="e.g., Found in the sewers of Neo-London." className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm mt-1 h-20 focus:border-emerald-500 focus:outline-none" />
            </div>

            <div>
            <label className="text-xs font-bold text-neutral-400 uppercase">Item Prompt Override</label>
            <textarea value={overrideItemPrompt} onChange={(e) => setOverrideItemPrompt(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-xs font-mono mt-1 h-40 focus:border-emerald-500 focus:outline-none text-neutral-300" />
            </div>

            <div>
            <label className="text-xs font-bold text-neutral-400 uppercase">Image Prompt Override</label>
            <textarea value={overrideImagePrompt} onChange={(e) => setOverrideImagePrompt(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-xs font-mono mt-1 h-20 focus:border-emerald-500 focus:outline-none text-neutral-300" />
            </div>

            <button onClick={handleGenerateItem} disabled={isGenerating} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black tracking-widest py-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/20 mt-4">
            {isGenerating ? 'INITIALIZING FORGE...' : 'GENERATE ITEM'}
            </button>
            </div>

            {/* RIGHT COLUMN: BROWSER */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <div className="flex space-x-2">
            <button onClick={handlePrev} disabled={currentIndex === 0 || items.length === 0} className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 px-3 py-1 rounded text-sm font-bold transition-colors">◄ Prev</button>
            <div className="text-neutral-500 text-sm font-mono flex items-center px-2">{items.length > 0 ? `${currentIndex + 1} / ${items.length}` : '0 / 0'}</div>
            <button onClick={handleNext} disabled={currentIndex === items.length - 1 || items.length === 0} className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 px-3 py-1 rounded text-sm font-bold transition-colors">Next ►</button>
            </div>
            <div className="flex space-x-2">
            <button onClick={() => alert('Save Edits: Phase 2')} className="text-xs font-bold text-emerald-500 hover:text-emerald-400">[ SAVE ]</button>
            <button onClick={handleDeleteItem} className="text-xs font-bold text-red-500 hover:text-red-400">[ DELETE ]</button>
            </div>
            </div>

            {activeItem ? (
                <div className="flex flex-col space-y-4">
                <div className="relative group w-full aspect-square bg-black rounded-lg border border-neutral-800 overflow-hidden shadow-inner">
                <img src={`http://localhost:8000/${activeItem.image_url.replace(/\\/g, '/')}`} alt="Item" className="w-full h-full object-cover opacity-80 group-hover:opacity-30 transition-opacity duration-300" />

                {/* UPGRADED HOVER OVERLAY */}
                <div className="absolute inset-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center text-center overflow-y-auto">
                <h3 className="text-2xl font-black text-emerald-400 drop-shadow-md">{activeItem.name}</h3>
                <p className="text-xs text-neutral-300 font-bold uppercase tracking-widest mb-2">
                {activeItem.type} {activeItem.equip_slot && activeItem.equip_slot !== "None" ? `| Slot: ${activeItem.equip_slot}` : ''} | Value: {activeItem.value}
                </p>

                {/* Dynamic Stats Rendering */}
                {activeItem.stats && Object.keys(activeItem.stats).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {Object.entries(activeItem.stats).map(([statName, statVal]) => (
                        <span key={statName} className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-800 uppercase font-bold shadow-md">
                        {statName.replace('_', ' ')}: {Number(statVal) > 0 ? `+${statVal}` : statVal}
                        </span>
                    ))}
                    </div>
                )}

                <p className="text-sm text-neutral-200 italic leading-relaxed bg-black/80 p-4 rounded drop-shadow-lg border border-neutral-700/50 shadow-xl">"{activeItem.description}"</p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                {activeItem.modifications.map((mod, i) => (<span key={i} className="text-[10px] bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded border border-emerald-800 uppercase font-bold shadow-md">{mod}</span>))}
                </div>
                </div>

                </div>

                <div className="bg-neutral-950 p-4 rounded border border-neutral-800 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase block">Name</label>
                <input type="text" value={activeItem.name} onChange={(e) => handleEditChange('name', e.target.value)} className="w-full bg-transparent border-b border-neutral-700 text-emerald-400 font-bold text-sm focus:outline-none" />
                </div>
                <div className="col-span-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase block">Type</label>
                <input type="text" value={activeItem.type} onChange={(e) => handleEditChange('type', e.target.value)} className="w-full bg-transparent border-b border-neutral-700 text-emerald-400 font-bold text-sm focus:outline-none" />
                </div>
                <div className="col-span-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase block">Slot</label>
                <input type="text" value={activeItem.equip_slot || 'None'} onChange={(e) => handleEditChange('equip_slot', e.target.value)} className="w-full bg-transparent border-b border-neutral-700 text-emerald-400 font-bold text-sm focus:outline-none" />
                </div>
                </div>
                <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase block">Description</label>
                <textarea value={activeItem.description} onChange={(e) => handleEditChange('description', e.target.value)} className="w-full bg-neutral-900 rounded border border-neutral-800 text-neutral-300 text-xs p-2 h-20 focus:outline-none focus:border-emerald-500" />
                </div>
                </div>

                <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
                <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Generated Vision Prompt</label>
                <p className="text-xs font-mono text-neutral-400 break-words">{activeItem.image_prompt}</p>
                </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-neutral-800 rounded-lg p-12">
                <p className="text-neutral-600 font-mono text-sm text-center">DATABASE EMPTY<br/>Initialize Forge to begin.</p>
                </div>
            )}
            </div>
            </div>
        )}

        {/* WIP TABS */}
        {(activeTab === 'NPCS' || activeTab === 'LOCATIONS') && (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-neutral-800 rounded-lg p-12 mt-8 animate-fade-in">
            <p className="text-neutral-600 font-mono text-sm text-center uppercase tracking-widest">
            {activeTab} Module Offline<br/>Awaiting construction sequence.
            </p>
            </div>
        )}
        </div>
    );
}
