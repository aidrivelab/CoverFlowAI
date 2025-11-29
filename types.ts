export enum Platform {
  YOUTUBE = 'YouTube',
  TIKTOK = 'TikTok/Douyin',
  INSTAGRAM = 'Instagram/XiaoHongShu',
  BILIBILI = 'Bilibili'
}

export enum AspectRatio {
  RATIO_16_9 = '16:9',
  RATIO_9_16 = '9:16',
  RATIO_4_3 = '4:3',
  RATIO_3_4 = '3:4',
  RATIO_1_1 = '1:1'
}

export enum ModelProvider {
  GEMINI = 'gemini',
  SILICONFLOW = 'siliconflow'
}

export interface ModelOption {
  id: string;
  name: string;
  badge?: string;
  description?: string;
}

export interface ProviderConfig {
  id: ModelProvider;
  name: string;
  icon: string;
  models: ModelOption[];
  apiKeyPlaceholder: string;
  website: string;
}

export interface AppSettings {
  activeProvider: ModelProvider;
  apiKeys: Record<ModelProvider, string>;
  selectedModels: Record<ModelProvider, string>;
}

export interface CoverFormData {
  mainTitle: string;
  subTitle: string;
  subjectImage: File | null;
  referenceImage: File | null;
  instruction: string;
  platform: Platform;
  aspectRatio: AspectRatio;
}

export interface GeneratedImage {
  url: string;
  id: string;
}

export interface FilePreview {
  file: File;
  url: string;
}