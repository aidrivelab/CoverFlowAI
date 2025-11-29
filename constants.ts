import { AspectRatio, ModelProvider, Platform, ProviderConfig } from "./types";

export const PLATFORMS = [
  { id: Platform.XIAOHONGSHU, label: '小红书', defaultRatio: AspectRatio.RATIO_3_4, icon: '📕' },
  { id: Platform.WECHAT, label: '微信公众号', defaultRatio: AspectRatio.RATIO_16_9, icon: '🟢' },
  { id: Platform.ZHIHU, label: '知乎', defaultRatio: AspectRatio.RATIO_16_9, icon: '🔵' },
  { id: Platform.DOUYIN, label: '抖音', defaultRatio: AspectRatio.RATIO_9_16, icon: '🎵' },
  { id: Platform.BILIBILI, label: 'Bilibili', defaultRatio: AspectRatio.RATIO_16_9, icon: '📺' },
  { id: Platform.YOUTUBE, label: 'YouTube', defaultRatio: AspectRatio.RATIO_16_9, icon: '🟥' },
  { id: Platform.TIKTOK, label: 'TikTok', defaultRatio: AspectRatio.RATIO_9_16, icon: '📱' },
  { id: Platform.INSTAGRAM, label: 'Instagram', defaultRatio: AspectRatio.RATIO_1_1, icon: '📸' },
];

export const ASPECT_RATIOS = [
  { id: AspectRatio.RATIO_16_9, label: '16:9 (Horizontal)' },
  { id: AspectRatio.RATIO_9_16, label: '9:16 (Vertical)' },
  { id: AspectRatio.RATIO_4_3, label: '4:3 (Standard)' },
  { id: AspectRatio.RATIO_3_4, label: '3:4 (Portrait)' },
  { id: AspectRatio.RATIO_1_1, label: '1:1 (Square)' },
];

export const DEFAULT_INSTRUCTION = "将对标模仿图中的人物替换为视觉素材中的人物，要求人物神态风格、人物姿势，拍摄滤镜等都能够准确还原对标模仿图像。";

export const MODEL_PROVIDERS: ProviderConfig[] = [
  {
    id: ModelProvider.GEMINI,
    name: 'Google Gemini',
    icon: '✨',
    apiKeyPlaceholder: 'Select via Google or enter key...',
    website: 'https://aistudio.google.com/',
    models: [
      { id: 'gemini-3-pro-image-preview', name: 'Gemini 3.0 Pro', badge: 'Best Quality', description: 'Recommended for high-res details' },
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash', badge: 'Fastest', description: 'Nano Banana - fast generation' }
    ]
  },
  {
    id: ModelProvider.SILICONFLOW,
    name: 'SiliconFlow',
    icon: '🌊',
    apiKeyPlaceholder: 'sk-cn-...',
    website: 'https://cloud.siliconflow.cn/',
    models: [
      { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 Schnell', badge: 'Speed', description: 'Very fast, high quality' },
      { id: 'black-forest-labs/FLUX.1-dev', name: 'FLUX.1 Dev', badge: 'Balanced', description: 'Developer version' },
      { id: 'stabilityai/stable-diffusion-3-medium', name: 'SD 3 Medium', description: 'Stable Diffusion 3' },
      { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 (via SiliconFlow)', description: 'Zhipu GLM' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 (via SiliconFlow)', description: 'Alibaba Qwen' }
    ]
  }
];

export const DEFAULT_SETTINGS = {
  activeProvider: ModelProvider.GEMINI,
  apiKeys: {
    [ModelProvider.GEMINI]: '',
    [ModelProvider.SILICONFLOW]: ''
  },
  selectedModels: {
    [ModelProvider.GEMINI]: 'gemini-3-pro-image-preview',
    [ModelProvider.SILICONFLOW]: 'black-forest-labs/FLUX.1-schnell'
  }
};