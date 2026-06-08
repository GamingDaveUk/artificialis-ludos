export default function Playground({ setCurrentView }: any) {
    return (
        <div className="max-w-5xl mx-auto w-full animate-fade-in">
        <div className="flex justify-between items-center mb-6 border-b border-emerald-900 pb-4">
        <h2 className="text-3xl font-bold text-emerald-500">The Playground</h2>
        <button onClick={() => setCurrentView('MENU')} className="text-neutral-400 hover:text-white transition-colors">[ Return to Menu ]</button>
        </div>
        <p className="text-neutral-500 italic mb-4">Item Generation Module (Under Construction)</p>
        </div>
    );
}
