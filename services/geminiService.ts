import { GoogleGenAI } from "@google/genai";
import { CoverFormData, ModelProvider, AppSettings } from "../types";
import { fileToBase64, getMimeType } from "../utils/fileUtils";

// --- Types & Interfaces ---

interface GenerationRequest {
  data: CoverFormData;
  model: string;
  apiKey: string;
}

// --- Helper Functions ---

export const checkApiKey = async (provider: ModelProvider, savedKey?: string): Promise<boolean> => {
  if (provider === ModelProvider.GEMINI) {
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      const hasSelected = await win.aistudio.hasSelectedApiKey();
      if (hasSelected) return true;
    }
    // Fallback to saved key or env var for Gemini
    return !!(savedKey || process.env.API_KEY);
  }
  // For other providers, just check if string is non-empty
  return !!savedKey && savedKey.length > 5;
};

export const requestApiKeySelection = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  } else {
    console.warn("AI Studio key selection not available in this environment.");
  }
};

const buildPrompt = (data: CoverFormData, forceChineseContext: boolean = false): string => {
   const hasChinese = /[\u4e00-\u9fa5]/.test(data.mainTitle + data.subTitle + data.instruction);
   
   // Base instructions focusing on text rendering
   let prompt = `
    Design a professional viral video thumbnail for ${data.platform}.
    
    CRITICAL TEXT INSTRUCTIONS (MUST RENDER EXACTLY):
    1. The image MUST contain the Main Title: "${data.mainTitle}"
    2. The image MUST contain the Subtitle: "${data.subTitle}"
    3. Text must be perfectly legible, correct spelling, high contrast, and professional typography.
    
    VISUAL STYLE & CONTENT:
    ${data.instruction}
    
    Aspect Ratio: ${data.aspectRatio}.
    Resolution: High definition, 4K, detailed texture.
  `;

  // Specific instructions for Chinese text
  if (hasChinese || forceChineseContext) {
    prompt += `
    
    LANGUAGE SETTING: CHINESE (简体中文)
    - The text contains Chinese characters (Hanzi).
    - You MUST render the Chinese characters correctly with correct strokes.
    - Do NOT generate garbled text, gibberish, or fake characters.
    - Use a bold, modern Chinese font (like Heiti or Sans-serif).
    `;
  }

  // If using [REFERENCE IMAGE] tags, keep them
  if (data.referenceImage) {
      prompt += `\nUse the provided [REFERENCE IMAGE] as a strict reference for layout, composition, and color palette.`;
  }
  if (data.subjectImage) {
      prompt += `\nUse the provided [SUBJECT IMAGE] as the main character/subject in the composition.`;
  }

  return prompt;
}

// --- Provider Implementations ---

// 1. Gemini Implementation
const generateWithGemini = async ({ data, model, apiKey }: GenerationRequest): Promise<string[]> => {
  const finalApiKey = apiKey || process.env.API_KEY;
  
  if (!finalApiKey) {
    throw new Error("未检测到 API Key。请在设置中输入 Key 或连接 Google 账户。");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  const parts: any[] = [];

  if (data.subjectImage) {
    const subjectBase64 = await fileToBase64(data.subjectImage);
    parts.push({
      inlineData: { data: subjectBase64, mimeType: getMimeType(data.subjectImage) },
    });
    parts.push({ text: "This is the [SUBJECT IMAGE]." });
  }

  if (data.referenceImage) {
    const refBase64 = await fileToBase64(data.referenceImage);
    parts.push({
      inlineData: { data: refBase64, mimeType: getMimeType(data.referenceImage) },
    });
    parts.push({ text: "This is the [REFERENCE IMAGE] for style." });
  }

  const prompt = buildPrompt(data);
  parts.push({ text: prompt });

  // Internal helper to perform the call
  const executeCall = async (targetModel: string) => {
    const config: any = {
      imageConfig: { aspectRatio: data.aspectRatio },
    };
    
    // imageSize only for 3-pro, cause error on flash
    if (targetModel.includes('gemini-3-pro')) {
      config.imageConfig.imageSize = "1K";
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: { parts: parts },
      config: config,
    });

    const images: string[] = [];
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
        }
      }
    }
    return images;
  };

  try {
    const images = await executeCall(model);
    if (images.length === 0) throw new Error("Gemini 生成完成，但没有返回图片数据。");
    return images;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Check for 403 Permission Denied
    if (error.status === 403 || error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission")) {
        // AUTO FALLBACK LOGIC
        if (model.includes('gemini-3-pro')) {
            console.warn("Gemini 3.0 Pro 403 Error. Attempting fallback to Gemini 2.5 Flash...");
            try {
                // Retry with Flash model
                const fallbackImages = await executeCall('gemini-2.5-flash-image');
                 if (fallbackImages.length > 0) return fallbackImages;
            } catch (fallbackError: any) {
                console.error("Fallback failed:", fallbackError);
                // Throw the original error explanation if fallback also fails
            }
        }

        throw new Error("权限拒绝 (403): 您的 Key 无法调用 Gemini 3.0 Pro。通常这需要绑定计费账户的 Google Cloud 项目。已尝试自动切换到 Flash 模型但也失败。建议直接在设置中选择 'Gemini 2.5 Flash'。");
    }

    // Check for 429 Resource Exhausted / Quota Exceeded
    if (error.status === 429 || error.code === 429 || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota")) {
      throw new Error("配额不足 (429): 您的 Google Cloud 项目免费配额已用完 (Limit: 0)，或未启用 Billing。建议：\n1. 在 Google Cloud Console 绑定计费账户。\n2. 或在设置中切换使用 SiliconFlow (硅基流动) 等其他服务商。");
    }

    // Catch specific networking/RPC errors
    if (error.message?.includes("xhr error") || error.message?.includes("Rpc failed") || error.message?.includes("Fetch failure")) {
        throw new Error("网络连接失败：无法连接到 Google 服务。请检查您的网络连接或 VPN 设置 (Network Error).");
    }
    
    // Pass through other errors
    throw error;
  }
};

// 2. SiliconFlow Implementation (OpenAI Compatible for Flux)
const generateWithSiliconFlow = async ({ data, model, apiKey }: GenerationRequest): Promise<string[]> => {
  if (!apiKey) throw new Error("SiliconFlow API Key is required.");
  
  // Flux struggles with text. We simplify the prompt to focus on text presence, 
  // but note that 'schnell' models are very bad at text.
  let prompt = buildPrompt(data);
  
  // Flux specific optimization
  prompt += "\nRender text in high quality. No typos.";

  let size = "1024x1024"; 

  const body = {
    model: model,
    prompt: prompt,
    image_size: size,
    num_inference_steps: 25 // Increase steps slightly for better text if possible
  };

  const response = await fetch("https://api.siliconflow.cn/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`SiliconFlow Error: ${err.message || response.statusText}`);
  }

  const result = await response.json();
  if (result.data && result.data.length > 0) {
    return result.data.map((item: any) => item.url);
  }
  
  throw new Error("No image data returned from SiliconFlow.");
};

// --- Main Export ---

export const generateCoverImage = async (
  data: CoverFormData, 
  settings: AppSettings
): Promise<string[]> => {
  const provider = settings.activeProvider;
  const model = settings.selectedModels[provider];
  const apiKey = settings.apiKeys[provider];

  console.log(`Starting generation with Provider: ${provider}, Model: ${model}`);

  switch (provider) {
    case ModelProvider.GEMINI:
      return generateWithGemini({ data, model, apiKey });
    case ModelProvider.SILICONFLOW:
      return generateWithSiliconFlow({ data, model, apiKey });
    default:
      throw new Error("Unknown provider selected.");
  }
};
