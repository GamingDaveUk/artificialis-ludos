import { useState, useEffect } from 'react'

export default function App() {
  const [currentView, setCurrentView] = useState<'MENU' | 'SETTINGS' | 'PLAYGROUND'>('MENU');

  // Settings State: LLM Basic
  const [activeSettingsTab, setActiveSettingsTab] = useState('LLM');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelList, setModelList] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [overrideModel, setOverrideModel] = useState('');
  const [debugMode, setDebugMode] = useState(false);

  // Settings State: Advanced Parameters
  type ParamState = { enabled: boolean, value: number };
  const [advancedParams, setAdvancedParams] = useState<Record<string, ParamState>>({
    temperature: { enabled: true, value: 0.8 },
    max_tokens: { enabled: true, value: 300 },
    top_p: { enabled: false, value: 1.0 },
    top_k: { enabled: false, value: 40 },
    repetition_penalty: { enabled: false, value: 1.1 },
    presence_penalty: { enabled: false, value: 0.0 },
    frequency_penalty: { enabled: false, value: 0.0 }
  });

  // Settings State: Testing
  const [testResponse, setTestResponse] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Settings State: Prompts
  const [promptFiles, setPromptFiles] = useState<string[]>([]);
  const [selectedPromptFile, setSelectedPromptFile] = useState('default.json');
  const [missingDefaultWarning, setMissingDefaultWarning] = useState(false);
  const [promptData, setPromptData] = useState({
    jailbreak: '',
    item_generator: '',
    item_image_gen: '',
    global_theme: ''
  });

  const VERSION = "0.1.0 Alpha";

  // --- Parameter Handlers ---
  const handleParamToggle = (key: string) => {
    setAdvancedParams(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  const handleParamChange = (key: string, val: string) => {
    setAdvancedParams(prev => ({ ...prev, [key]: { ...prev[key], value: Number(val) } }));
  };

  // --- LLM Functions ---
  const fetchModels = async () => {
    setIsLoadingModels(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:8000/api/settings/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, api_key: apiKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch models');
      setModelList(data.models);
      if (data.models.length > 0 && !selectedModel) setSelectedModel(data.models[0]);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setIsLoadingModels(false);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setErrorMsg('');
    setTestResponse('');

    // Build active params payload
    const activeParams: Record<string, number> = {};
    Object.entries(advancedParams).forEach(([key, param]) => {
      if (param.enabled) activeParams[key] = param.value;
    });

      const bodyPayload = {
        url,
        api_key: apiKey,
        model: selectedModel,
        override_model: overrideModel,
        advanced_params: activeParams,
        debug: debugMode
      };

      if (debugMode) {
        console.log("=== [FRONTEND DEBUG: OUTGOING PAYLOAD] ===");
        console.log(bodyPayload);
        console.log("=========================================");
      }

      try {
        const res = await fetch('http://localhost:8000/api/settings/llm/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Test failed');

        if (debugMode) {
          console.log("=== [FRONTEND DEBUG: RECEIVED RESPONSE] ===");
          console.log(data);
          console.log("==========================================");
        }

        setTestResponse(data.reply);
      } catch (err: any) {
        setErrorMsg(err.message);
      }
      setIsTesting(false);
  };

  // --- Prompt Functions ---
  const fetchPromptFiles = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/settings/prompts/files');
      const data = await res.json();
      setPromptFiles(data.files);
    } catch (err) { console.error("Failed to fetch prompt files", err); }
  };

  const loadPromptFile = async (filename: string) => {
    setMissingDefaultWarning(false);
    try {
      const res = await fetch(`http://localhost:8000/api/settings/prompts/load/${filename}`);
      if (!res.ok) {
        if (filename === 'default.json') setMissingDefaultWarning(true);
        throw new Error(`Failed to load ${filename}`);
      }
      const data = await res.json();
      setPromptData(data);
      setSelectedPromptFile(filename);
    } catch (err) { console.error(err); }
  };

  const savePromptFile = async () => {
    const defaultName = selectedPromptFile === 'default.json' ? 'my_custom_pack.json' : selectedPromptFile;
    const filename = window.prompt("Enter filename to save as (e.g., sci_fi_pack.json):", defaultName);
    if (!filename) return;
    if (filename.toLowerCase() === 'default.json') {
      alert("Error: You cannot overwrite the core default.json file!");
      return;
    }
    try {
      const res = await fetch('http://localhost:8000/api/settings/prompts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: promptData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      alert(data.message);
      fetchPromptFiles();
      setSelectedPromptFile(filename.endsWith('.json') ? filename : `${filename}.json`);
    } catch (err: any) { alert(`Save failed: ${err.message}`); }
  };

  useEffect(() => {
    if (currentView === 'SETTINGS') {
      fetchPromptFiles();
      loadPromptFile('default.json');
    }
  }, [currentView]);

  const handlePromptChange = (field: keyof typeof promptData, value: string) => {
    setPromptData(prev => ({ ...prev, [field]: value }));
  };

  // --- VIEWS ---
  const renderMainMenu = () => (
    <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in">
    <div className="text-center space-y-2">
    <h1 className="text-5xl font-black tracking-tighter text-emerald-500 drop-shadow-lg shadow-emerald-900">ARTIFICIALIS LUDOS</h1>
    <p className="text-neutral-500 font-mono text-sm tracking-widest">VERSION {VERSION}</p>
    </div>
    <div className="flex flex-col w-64 space-y-3">
    <button disabled className="bg-neutral-800 text-neutral-500 font-bold py-3 px-4 rounded cursor-not-allowed border border-neutral-700">New Game</button>
    <button disabled className="bg-neutral-800 text-neutral-500 font-bold py-3 px-4 rounded cursor-not-allowed border border-neutral-700">Load Game</button>
    <button onClick={() => setCurrentView('PLAYGROUND')} className="bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 font-bold py-3 px-4 rounded border border-emerald-900 transition-colors">Playground</button>
    <button onClick={() => setCurrentView('SETTINGS')} className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold py-3 px-4 rounded border border-neutral-700 transition-colors">Options</button>
    <button onClick={() => alert("Close the tab muppet")} className="bg-red-950/30 hover:bg-red-900/50 text-red-400 font-bold py-3 px-4 rounded border border-red-900 transition-colors mt-4">Exit</button>
    </div>
    </div>
  );

  const renderPlayground = () => (
    <div className="max-w-5xl mx-auto w-full animate-fade-in">
    <div className="flex justify-between items-center mb-6 border-b border-emerald-900 pb-4">
    <h2 className="text-3xl font-bold text-emerald-500">The Playground</h2>
    <button onClick={() => setCurrentView('MENU')} className="text-neutral-400 hover:text-white transition-colors">[ Return to Menu ]</button>
    </div>
    <p className="text-neutral-500 italic mb-4">Item Generation Module (Under Construction)</p>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto w-full animate-fade-in pb-12">
    <div className="flex justify-between items-center mb-6 border-b border-emerald-900 pb-4">
    <h2 className="text-3xl font-bold text-emerald-500">Engine Settings</h2>
    <button onClick={() => setCurrentView('MENU')} className="text-neutral-400 hover:text-white transition-colors">[ Return to Menu ]</button>
    </div>

    <div className="flex space-x-2 mb-6 border-b border-neutral-800">
    {['LLM', 'Image Gen', 'Prompts'].map((tab) => (
      <button
      key={tab}
      onClick={() => setActiveSettingsTab(tab)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        activeSettingsTab === tab ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-neutral-500 hover:text-neutral-300'
      }`}
      >
      {tab}
      </button>
    ))}
    </div>

    {activeSettingsTab === 'LLM' && (
      <div className="bg-neutral-900 border border-neutral-800 rounded p-6 space-y-8 shadow-xl">

      {/* Basic Connection Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">API URL</label>
      <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Leave blank to use .env default" className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
      </div>
      <div className="space-y-2">
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">API Key</label>
      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Leave blank to use .env default" className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
      </div>
      <div className="space-y-2">
      <div className="flex justify-between items-center">
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Available Models</label>
      <button onClick={fetchModels} disabled={isLoadingModels} className="text-xs text-emerald-500 hover:text-emerald-400 disabled:opacity-50">{isLoadingModels ? 'Fetching...' : '[ Refresh ]'}</button>
      </div>
      <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
      <option value="" disabled>Select a model...</option>
      {modelList.map(m => (<option key={m} value={m}>{m}</option>))}
      </select>
      </div>
      <div className="space-y-2">
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Model Override</label>
      <input type="text" value={overrideModel} onChange={(e) => setOverrideModel(e.target.value)} placeholder="e.g., gpt-4, custom-model" className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
      </div>
      </div>

      {/* Advanced Parameters Section */}
      <div className="border-t border-neutral-800 pt-6">
      <div className="flex justify-between items-center mb-4">
      <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-widest">Advanced Parameters</h3>
      <label className="flex items-center space-x-2 bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800 cursor-pointer select-none">
      <input
      type="checkbox"
      checked={debugMode}
      onChange={() => setDebugMode(!debugMode)}
      className="accent-emerald-500 cursor-pointer"
      />
      <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
      Debug Mode {debugMode ? '[ON]' : '[OFF]'}
      </span>
      </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Object.entries(advancedParams).map(([key, param]) => (
        <div key={key} className={`bg-neutral-950 border border-neutral-800 rounded p-3 flex flex-col space-y-2 transition-opacity duration-200 ${param.enabled ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-neutral-300 capitalize">
        {key.replace('_', ' ')}
        </label>
        <input
        type="checkbox"
        checked={param.enabled}
        onChange={() => handleParamToggle(key)}
        className="accent-emerald-500 cursor-pointer"
        />
        </div>
        <input
        type="number"
        step="0.1"
        value={param.value}
        onChange={(e) => handleParamChange(key, e.target.value)}
        disabled={!param.enabled}
        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:cursor-not-allowed"
        />
        </div>
      ))}
      </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/30 border border-red-900 text-red-400 p-3 rounded text-sm font-mono">[ERROR] {errorMsg}</div>
      )}

      <div className="border-t border-neutral-800 pt-6">
      <button onClick={testConnection} disabled={isTesting || (!selectedModel && !overrideModel)} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-2 px-6 rounded transition-colors shadow-lg shadow-emerald-900/20">
      {isTesting ? 'Sending Transmission...' : 'Test Connection'}
      </button>
      <div className="mt-4 bg-neutral-950 border border-neutral-800 rounded p-4 min-h-[100px]">
      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-2">System Response</label>
      {testResponse ? (<p className="text-emerald-300 font-mono text-sm leading-relaxed">{testResponse}</p>) : (<p className="text-neutral-700 font-mono text-sm italic">Awaiting life signs...</p>)}
      </div>
      </div>
      </div>
    )}

    {activeSettingsTab === 'Image Gen' && (
      <div className="bg-neutral-900 border border-neutral-800 rounded p-6 shadow-xl">
      <p className="text-neutral-400 text-sm mb-4">ComfyUI and Image Generation settings will go here.</p>
      </div>
    )}

    {activeSettingsTab === 'Prompts' && (
      <div className="bg-neutral-900 border border-neutral-800 rounded p-6 space-y-6 shadow-xl">
      {missingDefaultWarning && (
        <div className="bg-red-950 border border-red-900 text-red-400 p-4 rounded font-mono text-sm animate-pulse">
        [CRITICAL ERROR] default.json is missing from the prompts directory. Please restore the file to ensure engine stability.
        </div>
      )}
      <div className="flex items-center space-x-4 bg-neutral-950 p-4 rounded border border-neutral-800">
      <div className="flex-1">
      <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Active Prompt Pack</label>
      <select value={selectedPromptFile} onChange={(e) => loadPromptFile(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500">
      {promptFiles.map(f => (<option key={f} value={f}>{f}</option>))}
      </select>
      </div>
      <div className="flex space-x-2 mt-5">
      <button onClick={fetchPromptFiles} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded text-sm font-bold border border-neutral-700 transition-colors">Refresh</button>
      <button onClick={savePromptFile} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold shadow-lg transition-colors">Save As...</button>
      </div>
      </div>
      <div className="space-y-4">
      <div>
      <label className="text-xs font-bold text-neutral-400 uppercase">Global Theme Modifier</label>
      <input type="text" value={promptData.global_theme} onChange={(e) => handlePromptChange('global_theme', e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm mt-1 focus:outline-none focus:border-emerald-500" />
      </div>
      <div>
      <label className="text-xs font-bold text-neutral-400 uppercase">Universal Jailbreak</label>
      <textarea value={promptData.jailbreak} onChange={(e) => handlePromptChange('jailbreak', e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm mt-1 h-20 focus:outline-none focus:border-emerald-500 font-mono" />
      </div>
      <div>
      <label className="text-xs font-bold text-neutral-400 uppercase">Item Generation Prompt</label>
      <textarea value={promptData.item_generator} onChange={(e) => handlePromptChange('item_generator', e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm mt-1 h-40 focus:outline-none focus:border-emerald-500 font-mono" />
      </div>
      <div>
      <label className="text-xs font-bold text-neutral-400 uppercase">Item Image Gen Prompt</label>
      <textarea value={promptData.item_image_gen} onChange={(e) => handlePromptChange('item_image_gen', e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm mt-1 h-20 focus:outline-none focus:border-emerald-500 font-mono" />
      </div>
      </div>
      </div>
    )}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex items-start justify-center pt-20">
    {currentView === 'MENU' && renderMainMenu()}
    {currentView === 'SETTINGS' && renderSettings()}
    {currentView === 'PLAYGROUND' && renderPlayground()}
    </div>
  )
}
