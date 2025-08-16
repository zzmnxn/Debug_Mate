import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiConfig } from '../config/ApiConfig';

let _model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

export function getModel() {
  if (_model) return _model;
  const gen = new GoogleGenerativeAI(ApiConfig.GEMINI_API_KEY);
  _model = gen.getGenerativeModel({
    model: ApiConfig.geminiModel,
    generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
  });
  return _model;
}
