import React from 'react';
import { ModelProvider } from '../types';
import { MODEL_PROVIDERS } from '../constants';

interface HeaderProps {
  onOpenSettings: () => void;
  activeProvider: ModelProvider;
  currentModel: string;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, activeProvider, currentModel }) => {
  const providerConfig = MODEL_PROVIDERS.find(p => p.id === activeProvider);
  const modelName = providerConfig?.models.find(m => m.id === currentModel)?.name || currentModel;
  const providerName = providerConfig?.name || 'Unknown';

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">CoverFlow AI-By AI驱动创新</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-100 items-center gap-1">
          <span>{providerConfig?.icon} {providerName} : {modelName}</span>
        </div>
        <div className="hidden sm:block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">
          V1.1
        </div>
        
        <button 
          onClick={onOpenSettings}
          className="ml-2 w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 transition-colors"
          title="Model Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;