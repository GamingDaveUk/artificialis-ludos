export default function Settings({
    setCurrentView, activeSettingsTab, setActiveSettingsTab, url, setUrl, apiKey, setApiKey,
    modelList, selectedModel, setSelectedModel, overrideModel, setOverrideModel, debugMode, setDebugMode,
    advancedParams, handleParamToggle, handleParamChange, isLoadingModels, fetchModels, isTesting,
    testConnection, testResponse, errorMsg, promptFiles, selectedPromptFile, loadPromptFile,
    missingDefaultWarning, fetchPromptFiles, savePromptFile, promptData, handlePromptChange
}: any) {
    return (
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
            {modelList.map((m: string) => (<option key={m} value={m}>{m}</option>))}
            </select>
            </div>
            <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Model Override</label>
            <input type="text" value={overrideModel} onChange={(e) => setOverrideModel(e.target.value)} placeholder="e.g., gpt-4, custom-model" className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            </div>

            <div className="border-t border-neutral-800 pt-6">
            <div className="flex justify-between items-center mb-4">
            <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-widest">Advanced Parameters</h3>
            <label className="flex items-center space-x-2 bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800 cursor-pointer select-none">
            <input type="checkbox" checked={debugMode} onChange={() => setDebugMode(!debugMode)} className="accent-emerald-500 cursor-pointer" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">Debug Mode {debugMode ? '[ON]' : '[OFF]'}</span>
            </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(advancedParams).map(([key, param]: any) => (
                <div key={key} className={`bg-neutral-950 border border-neutral-800 rounded p-3 flex flex-col space-y-2 transition-opacity duration-200 ${param.enabled ? 'opacity-100' : 'opacity-40'}`}>
                <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-neutral-300 capitalize">{key.replace('_', ' ')}</label>
                <input type="checkbox" checked={param.enabled} onChange={() => handleParamToggle(key)} className="accent-emerald-500 cursor-pointer" />
                </div>
                <input type="number" step="0.1" value={param.value} onChange={(e) => handleParamChange(key, e.target.value)} disabled={!param.enabled} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:cursor-not-allowed" />
                </div>
            ))}
            </div>
            </div>

            {errorMsg && <div className="bg-red-950/30 border border-red-900 text-red-400 p-3 rounded text-sm font-mono">[ERROR] {errorMsg}</div>}

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
            {promptFiles.map((f: string) => (<option key={f} value={f}>{f}</option>))}
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
}
