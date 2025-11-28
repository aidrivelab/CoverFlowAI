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

  // Gemini handles complex instructions well, use the standard robust prompt
  const prompt = buildPrompt(data);
  parts.push({ text: prompt });

  const config: any = {
    imageConfig: { aspectRatio: data.aspectRatio },
  };
  
  // imageSize only for 3-pro
  if (model.includes('gemini-3-pro')) {
    config.imageConfig.imageSize = "1K";
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
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

    if (images.length === 0) throw new Error("Gemini 生成完成，但没有返回图片数据。");
    return images;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Check for 403 Permission Denied
    if (error.status === 403 || error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission")) {
        throw new Error("权限拒绝 (403): 您的 API Key 没有权限调用此模型。原因可能为：1. Key 无效。2. 该项目未启用 API。3. Gemini 3.0 Pro 可能需要付费项目的 Key。请尝试切换到 'Gemini 2.5 Flash' 模型。");
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

// 3. GLM (Zhipu AI) Implementation
const generateWithGLM = async ({ data, model, apiKey }: GenerationRequest): Promise<string[]> => {
  if (!apiKey) throw new Error("GLM (Zhipu) API Key is required.");

  // For GLM (Chinese Model), we append a strong Chinese instruction at the end
  // forcing the model to pay attention to the characters.
  let prompt = buildPrompt(data, true); 
  prompt += `\n【重要】请确保画面中的文字 "${data.mainTitle}" 和 "${data.subTitle}" 书写正确，不要出现乱码或错别字。使用清晰的无衬线字体。`;

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`, 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt
      })
    });

    if (!response.ok) {
        if (response.status === 0) {
            throw new Error("CORS Error: The browser blocked the request to Zhipu AI. Please use a local proxy or allow CORS.");
        }
        const errText = await response.text();
        throw new Error(`GLM Error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    if (result.data && result.data.length > 0) {
      return result.data.map((item: any) => item.url);
    }
    throw new Error("No image returned from GLM.");

  } catch (error: any) {
     if (error.message.includes("Failed to fetch")) {
        throw new Error("Network Error: Could not connect to Zhipu AI. This is likely a CORS issue in the browser. Please try Gemini or SiliconFlow.");
     }
     throw error;
  }
};

// 4. Qwen (Wanxiang) Implementation
const generateWithQwen = async ({ data, model, apiKey }: GenerationRequest): Promise<string[]> => {
  if (!apiKey) throw new Error("Qwen (Dashscope) API Key is required.");

  // Qwen Wanxiang works better with native Chinese prompts
  let prompt = buildPrompt(data, true);
  prompt += `\n【指令】生成一张视频封面。必须包含文字："${data.mainTitle}" 和副标题 "${data.subTitle}"。文字必须清晰可见，汉字笔画正确，无乱码。`;

  // 1. Submit Task
  const submitResponse = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-DashScope-Async": "enable",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      input: {
        prompt: prompt
      },
      parameters: {
        style: "<auto>",
        size: "1024*1024",
        n: 1
      }
    })
  });

  if (!submitResponse.ok) {
     const err = await submitResponse.json();
     throw new Error(`Qwen Submit Error: ${err.message || submitResponse.statusText}`);
  }

  const submitResult = await submitResponse.json();
  const taskId = submitResult.output?.task_id;
  if (!taskId) throw new Error("Qwen did not return a Task ID.");

  // 2. Poll for results
  let status = "PENDING";
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout
  
  while (status !== "SUCCEEDED" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
    attempts++;

    const statusResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!statusResponse.ok) continue;

    const statusResult = await statusResponse.json();
    status = statusResult.output?.task_status;

    if (status === "SUCCEEDED") {
      const results = statusResult.output?.results;
      if (results && results.length > 0) {
        return results.map((item: any) => item.url);
      }
    } else if (status === "FAILED") {
       throw new Error(`Qwen Generation Failed: ${statusResult.output?.message}`);
    }
  }

  throw new Error("Qwen generation timed out.");
};

// 5. Doubao (Volcengine) - Placeholder
const generateWithDoubao = async ({ data, model, apiKey }: GenerationRequest): Promise<string[]> => {
    throw new Error("Doubao (Volcengine) requires complex request signing that is not secure or easy to implement in a pure client-side browser app. Please use SiliconFlow or Gemini.");
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
    case ModelProvider.GLM:
      return generateWithGLM({ data, model, apiKey });
    case ModelProvider.QWEN:
      return generateWithQwen({ data, model, apiKey });
    case ModelProvider.DOUBAO:
      return generateWithDoubao({ data, model, apiKey });
    default:
      throw new Error("Unknown provider selected.");
  }
};