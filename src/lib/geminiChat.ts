/**
 * src/lib/geminiChat.ts
 * Chat de MIO. Todas las preguntas pasan por el backend (/chat), que es el único que
 * conoce la clave del modelo. El navegador nunca recibe ni envía claves de IA.
 */

import { apiClient } from './apiClient';

export interface GeminiChatResponse {
  response: string;
  chart_override?: any | null;
}

export async function askGemini(
  message: string,
  context: any,
  charts?: any[]
): Promise<GeminiChatResponse> {
  try {
    const res = await apiClient.post<any>('/chat', { message, context: context || {}, charts: charts || [] });
    const text = res?.response || res?.reply || res?.message || res?.text;
    if (text) return { response: text, chart_override: res?.chart_override || null };
  } catch (err) {
    console.warn('[MIO Chat] El servicio de chat no respondió:', err);
  }
  // Honest failure: never fabricate an answer about the user's data.
  return {
    response: 'Ahora no pude responder. Probá de nuevo en un momento; mientras tanto, los números del panel siguen disponibles.',
    chart_override: null,
  };
}
