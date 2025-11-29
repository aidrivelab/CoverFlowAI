import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import { AspectRatio, CoverFormData, Platform, AppSettings, ModelProvider } from './types';
import { PLATFORMS, ASPECT_RATIOS, DEFAULT_INSTRUCTION, MODEL_PROVIDERS, DEFAULT_SETTINGS } from './constants';
import { generateCoverImage, requestApiKeySelection, checkApiKey } from './services/geminiService';

function App() {
  const [formData, setFormData] = useState<CoverFormData>({
    mainTitle: '小白如何0基础学Web3',
    subTitle: '5分钟入门 | 最强指南',
    subjectImage: null,
    referenceImage: null,
    instruction: DEFAULT_INSTRUCTION,
    platform: Platform.XIAOHONGSHU,
    aspectRatio: AspectRatio.RATIO_3_4
  });

  const [subjectPreview, setSubjectPreview] = useState<string | undefined>(undefined);
  const [refPreview, setRefPreview] = useState<string | undefined>(undefined);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('coverflow_settings_v1');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Local state for the settings modal (to allow editing without applying immediately if needed, though we apply live here)
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    localStorage.setItem('coverflow_settings_v1', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // When opening settings or switching provider, update temp key field
    setTempApiKey(settings.apiKeys[settings.activeProvider] || '');
  }, [settings.activeProvider, showSettings]);

  const handleFileChange = (field: 'subjectImage' | 'referenceImage', file: File) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    if (field === 'subjectImage') {
      setSubjectPreview(url);
    } else {
      setRefPreview(url);
    }
  };

  const handlePlatformChange = (platform: Platform) => {
    const platformData = PLATFORMS.find(p => p.id === platform);
    setFormData(prev => ({
      ...prev,
      platform,
      aspectRatio: platformData ? platformData.defaultRatio : AspectRatio.RATIO_16_9
    }));
  };

  const handleGenerate = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Basic check if key exists for active provider
      const activeProvider = settings.activeProvider;
      const isKeyValid = await checkApiKey(activeProvider, settings.apiKeys[activeProvider]);
      
      if (!isKeyValid) {
        if (activeProvider === ModelProvider.GEMINI) {
             await requestApiKeySelection();
             // Gemini might inject key, so we proceed after selection attempt
        } else {
            setShowSettings(true);
            throw new Error(`Please enter an API Key for ${MODEL_PROVIDERS.find(p => p.id === activeProvider)?.name} in Settings.`);
        }
      }

      const images = await generateCoverImage(formData, settings);
      setGeneratedImages(images);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during generation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateApiKey = (value: string) => {
    setTempApiKey(value);
    setSettings(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [prev.activeProvider]: value
      }
    }));
  };

  const handleModelSelect = (modelId: string) => {
    setSettings(prev => ({
      ...prev,
      selectedModels: {
        ...prev.selectedModels,
        [prev.activeProvider]: modelId
      }
    }));
  };

  const handleClearData = () => {
    if (window.confirm('确定要清除所有本地存储的 API Key 和设置吗？\n清除后您需要重新输入 Key。')) {
      localStorage.removeItem('coverflow_settings_v1');
      setSettings(DEFAULT_SETTINGS);
      setTempApiKey('');
      alert('所有本地数据已清除。');
    }
  };

  const activeProviderConfig = MODEL_PROVIDERS.find(p => p.id === settings.activeProvider);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header 
        onOpenSettings={() => setShowSettings(true)} 
        activeProvider={settings.activeProvider}
        currentModel={settings.selectedModels[settings.activeProvider]}
      />
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
             
             {/* Header */}
             <div className="flex justify-between items-center p-6 border-b border-gray-100">
               <h3 className="text-xl font-bold text-gray-900">Model Settings</h3>
               <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                 <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             <div className="flex flex-1 overflow-hidden">
               {/* Sidebar: Providers */}
               <div className="w-1/3 bg-gray-50 border-r border-gray-100 p-4 space-y-2 overflow-y-auto">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Providers</h4>
                  {MODEL_PROVIDERS.map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => setSettings(prev => ({ ...prev, activeProvider: provider.id }))}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all
                        ${settings.activeProvider === provider.id 
                          ? 'bg-white shadow-sm ring-1 ring-gray-200 text-purple-700' 
                          : 'text-gray-600 hover:bg-gray-100'}
                      `}
                    >
                      <span className="text-xl">{provider.icon}</span>
                      <span className="font-medium text-sm">{provider.name}</span>
                    </button>
                  ))}
               </div>

               {/* Main Content: Configuration */}
               <div className="w-2/3 p-6 overflow-y-auto">
                 {activeProviderConfig && (
                   <div className="space-y-6">
                     
                     <div className="flex items-center gap-3 mb-2">
                       <span className="text-3xl">{activeProviderConfig.icon}</span>
                       <div>
                         <h2 className="text-lg font-bold text-gray-900">{activeProviderConfig.name}</h2>
                         <a href={activeProviderConfig.website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                           Visit Website ↗
                         </a>
                       </div>
                     </div>

                     {/* API Key Input */}
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-700">API Key</label>
                       <div className="relative">
                         <input 
                            type="password"
                            value={tempApiKey}
                            onChange={(e) => handleUpdateApiKey(e.target.value)}
                            placeholder={activeProviderConfig.apiKeyPlaceholder}
                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-mono text-sm"
                         />
                         <div className="absolute right-3 top-1/2 -translate-y-1/2">
                           {tempApiKey ? (
                             <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded">SET</span>
                           ) : (
                             <span className="text-gray-400 text-xs">Required</span>
                           )}
                         </div>
                       </div>
                       
                       {/* Security Disclaimer */}
                       <div className="flex items-start gap-2 bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs mt-2 border border-yellow-100">
                          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          <p>
                             安全提示：您的 API Key 仅存储在浏览器的 LocalStorage 中，并直接发送给服务提供商。它永远不会上传到我们的服务器。
                          </p>
                       </div>

                       {activeProviderConfig.id === ModelProvider.GEMINI && (
                         <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Or use Google Auth:</span>
                            <button 
                              onClick={requestApiKeySelection}
                              className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                              Connect Google Account
                            </button>
                         </div>
                       )}
                     </div>

                     <hr className="border-gray-100" />

                     {/* Model Selection */}
                     <div className="space-y-3">
                       <label className="text-sm font-medium text-gray-700">Select Model</label>
                       <div className="grid grid-cols-1 gap-3">
                         {activeProviderConfig.models.map(model => (
                           <label 
                             key={model.id}
                             className={`
                               flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                               ${settings.selectedModels[settings.activeProvider] === model.id 
                                 ? 'border-purple-500 bg-purple-50/50' 
                                 : 'border-gray-200 hover:bg-gray-50'}
                             `}
                           >
                             <input 
                               type="radio" 
                               name="model_select"
                               checked={settings.selectedModels[settings.activeProvider] === model.id}
                               onChange={() => handleModelSelect(model.id)}
                               className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                             />
                             <div className="flex-1">
                               <div className="flex justify-between items-center">
                                 <span className="font-medium text-gray-900 text-sm">{model.name}</span>
                                 {model.badge && (
                                   <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                     {model.badge}
                                   </span>
                                 )}
                               </div>
                               {model.description && (
                                 <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                               )}
                             </div>
                           </label>
                         ))}
                       </div>
                     </div>

                   </div>
                 )}
               </div>
             </div>

             <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
               <button 
                  onClick={handleClearData}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
               >
                  清除所有数据
               </button>
               <button 
                 onClick={() => setShowSettings(false)}
                 className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
               >
                 Save & Close
               </button>
             </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 pb-2">
            AI 爆款视频封面工坊
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            使用 {activeProviderConfig?.name} 生成。<br/>
            上传您的素材 + 大佬的爆款图 = 您的新封面。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Inputs */}
          <div className="space-y-6">
            
            {/* 1. Content Copy */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
               <div className="flex items-center gap-3 mb-4">
                 <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                 <h3 className="font-bold text-gray-800 text-lg">内容文案</h3>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">主标题 (痛点/爆点) *</label>
                   <input 
                    type="text" 
                    value={formData.mainTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, mainTitle: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                    placeholder="输入主标题"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">副标题 / 补充信息</label>
                   <input 
                    type="text" 
                    value={formData.subTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subTitle: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="输入副标题"
                   />
                 </div>
               </div>
            </div>

            {/* 2. Visual Assets */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
               <div className="flex items-center gap-3 mb-4">
                 <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">2</span>
                 <h3 className="font-bold text-gray-800 text-lg">视觉素材</h3>
               </div>

               <FileUpload 
                  label="人物 / 主体素材 (您的截图)"
                  subLabel="AI 将保留此人物特征"
                  badge="Subject"
                  file={formData.subjectImage}
                  onFileSelect={(f) => handleFileChange('subjectImage', f)}
                  previewUrl={subjectPreview}
               />
            </div>

          </div>

          {/* Right Column: Style & Settings */}
          <div className="space-y-6">

             {/* 3. Benchmark Mimicry */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                   <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-bold">3</span>
                   <h3 className="font-bold text-gray-800 text-lg">对标模仿 (Key)</h3>
                 </div>
                 <span className="text-xs text-pink-500 font-medium bg-pink-50 px-2 py-1 rounded">⭐ AI 将学习构图与色调</span>
               </div>

               <div className="space-y-4">
                 <FileUpload 
                    label="对标参考图 (大佬的爆款)"
                    badge="Style Ref"
                    file={formData.referenceImage}
                    onFileSelect={(f) => handleFileChange('referenceImage', f)}
                    previewUrl={refPreview}
                 />

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">您想模仿这张图的什么？</label>
                    <textarea 
                      value={formData.instruction}
                      onChange={(e) => setFormData(prev => ({ ...prev, instruction: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-sm leading-relaxed"
                      placeholder="描述您的修改需求..."
                    />
                    <p className="text-right text-xs text-gray-400 mt-1">* AI 会自动去除参考图中的时间水印</p>
                 </div>
               </div>
            </div>

            {/* 4. Platform & Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
               <div className="flex items-center gap-3 mb-4">
                 <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">4</span>
                 <h3 className="font-bold text-gray-800 text-lg">平台与风格</h3>
               </div>

               <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">目标平台</label>
                    <div className="grid grid-cols-2 gap-2">
                       {PLATFORMS.map(p => (
                         <button
                           key={p.id}
                           onClick={() => handlePlatformChange(p.id)}
                           className={`
                             flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                             ${formData.platform === p.id 
                               ? 'bg-indigo-600 text-white shadow-md' 
                               : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}
                           `}
                         >
                           <span>{p.icon}</span>
                           {p.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">生成比例</label>
                    <select
                      value={formData.aspectRatio}
                      onChange={(e) => setFormData(prev => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      {ASPECT_RATIOS.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                 </div>
               </div>
            </div>

          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Generate Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-40">
           <div className="max-w-6xl mx-auto flex justify-end items-center gap-4">
              <div className="text-sm text-gray-500 hidden md:block">
                 预计消耗 10-15s · 支持无限次重试
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`
                  px-8 py-3 rounded-full font-bold text-white text-lg shadow-lg transform transition-all active:scale-95
                  ${isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-500/30'}
                `}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  `Generate with ${activeProviderConfig?.name || 'AI'}`
                )}
              </button>
           </div>
        </div>

        {/* Results Section */}
        {generatedImages.length > 0 && (
          <div className="mt-12 mb-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>🎉</span> 生成结果
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {generatedImages.map((imgUrl, index) => (
                 <div key={index} className="group relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white">
                    <img 
                      src={imgUrl} 
                      alt={`Generated Cover ${index + 1}`} 
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                       <a 
                        href={imgUrl} 
                        download={`coverflow-ai-generated-${index}.png`}
                        className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
                       >
                         Download HD
                       </a>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
}

export default App;