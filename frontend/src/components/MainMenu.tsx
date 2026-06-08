export default function MainMenu({ setCurrentView, version }: any) {
    return (
        <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
        <h1 className="text-5xl font-black tracking-tighter text-emerald-500 drop-shadow-lg shadow-emerald-900">
        ARTIFICIALIS LUDOS
        </h1>
        <p className="text-neutral-500 font-mono text-sm tracking-widest">VERSION {version}</p>
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
}
