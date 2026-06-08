import { useState, useEffect } from 'react'
import MainMenu from './components/MainMenu'
import Playground from './components/Playground'
import Settings from './components/Settings'

export default function App() {
  const [currentView, setCurrentView] = useState<'MENU' | 'SETTINGS' | 'PLAYGROUND'>('MENU');

  // Settings State: LLM Basic
  const [activeSettingsTab, setActiveSettingsTab] = useState('LLM');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [overrideModel, setOverrideModel] = useState('');
  const [debugMode, setDebugMode] = useState(false);

  // Settings State: Advanced Parameters
  type ParamState = { enabled: boolean, value: number };
  const [advancedParams, setAdvancedParams] = useState<Record<string, ParamState>>({
    temperature: { enabled: true, value: 0.8 },
    max_tokens: { enabled: true, value: 16384 },
    context_length: { enabled: true, value: 32768 },
    top_p: { enabled: false, value: 1.0 },
    top_k: { enabled: false, value: 40 },
    repetition_penalty: { enabled: false, value: 1.1 },
    presence_penalty: { enabled: false, value: 0.0 },
    frequency_penalty: { enabled: false, value: 0.0 }
  });

  const [modelList, setModelList] = useState<string[]>([]);
  const [testResponse, setTestResponse] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [promptFiles, setPromptFiles] = useState<string[]>([]);
  const [selectedPromptFile, setSelectedPromptFile] = useState('default.json');
  const [missingDefaultWarning, setMissingDefaultWarning] = useState(false);
  const [promptData, setPromptData] = useState({
    jailbreak: '', item_generator: '', item_image_gen: '', global_theme: ''
  });

  const VERSION = "0.1.0 Alpha";

  // --- BOOT SEQUENCE: LOAD SERVER CONFIG ---
  useEffect(() => {
    const fetchServerConfig = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/settings/config');
        if (res.ok) {
          const data = await res.json();
          setUrl(data.url || '');
          // We NO LONGER set the API key from the server
          setSelectedModel(data.selected_model || '');
          setOverrideModel(data.override_model || '');
          setDebugMode(data.debug_mode || false);
          if (data.advanced_params) setAdvancedParams(data.advanced_params);
        }
      } catch (err) { console.error("Failed to fetch server config", err); }
    };
    fetchServerConfig();
  }, []);

  // --- SAVE CONFIG TO SERVER ---
  const saveServerConfig = async () => {
    // Notice: We intentionally leave apiKey OUT of this payload
    const payload = {
      url, selected_model: selectedModel, override_model: overrideModel,
      debug_mode: debugMode, advanced_params: advancedParams
    };
    try {
      const res = await fetch('http://localhost:8000/api/settings/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert("Server configuration saved successfully! (API Keys remain safely in your .env file)");
      else alert("Failed to save configuration.");
    } catch (err) { console.error(err); }
  };

  const handleParamToggle = (key: string) => {
    setAdvancedParams(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  const handleParamChange = (key: string, val: string) => {
    setAdvancedParams(prev => ({ ...prev, [key]: { ...prev[key], value: Number(val) } }));
  };

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
    } catch (err: any) { setErrorMsg(err.message); }
    setIsLoadingModels(false);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setErrorMsg('');
    setTestResponse('');

    const activeParams: Record<string, number> = {};
    Object.entries(advancedParams).forEach(([key, param]) => {
      if (param.enabled && key !== 'context_length') activeParams[key] = param.value;
    });

      const bodyPayload = { url, api_key: apiKey, model: selectedModel, override_model: overrideModel, advanced_params: activeParams, debug: debugMode };

      if (debugMode) {
        console.log("=== [FRONTEND DEBUG: OUTGOING PAYLOAD] ===");
        console.log(bodyPayload);
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
        }
        setTestResponse(data.reply);
      } catch (err: any) { setErrorMsg(err.message); }
      setIsTesting(false);
  };

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
    const filename = window.prompt("Enter filename to save as:", defaultName);
    if (!filename) return;
    if (filename.toLowerCase() === 'default.json') return alert("Error: You cannot overwrite default.json!");
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex items-start justify-center pt-20">
    {currentView === 'MENU' && <MainMenu setCurrentView={setCurrentView} version={VERSION} />}
    {currentView === 'SETTINGS' && (
      <Settings
      setCurrentView={setCurrentView} activeSettingsTab={activeSettingsTab} setActiveSettingsTab={setActiveSettingsTab}
      url={url} setUrl={setUrl} apiKey={apiKey} setApiKey={setApiKey} modelList={modelList}
      selectedModel={selectedModel} setSelectedModel={setSelectedModel} overrideModel={overrideModel}
      setOverrideModel={setOverrideModel} debugMode={debugMode} setDebugMode={setDebugMode}
      advancedParams={advancedParams} handleParamToggle={handleParamToggle} handleParamChange={handleParamChange}
      isLoadingModels={isLoadingModels} fetchModels={fetchModels} isTesting={isTesting} testConnection={testConnection}
      testResponse={testResponse} errorMsg={errorMsg} promptFiles={promptFiles} selectedPromptFile={selectedPromptFile}
      loadPromptFile={loadPromptFile} missingDefaultWarning={missingDefaultWarning} fetchPromptFiles={fetchPromptFiles}
      savePromptFile={savePromptFile} promptData={promptData} handlePromptChange={handlePromptChange}
      saveServerConfig={saveServerConfig} // We pass the new save function down
      />
    )}
    {currentView === 'PLAYGROUND' && <Playground setCurrentView={setCurrentView} />}
    </div>
  )
}
