export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string for persistence
}

export interface Persona {
  id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  systemInstruction: string;
  suggestedPrompts: string[];
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  personaId: string;
  temperature: number;
  systemInstructionCustom?: string;
  createdAt: string;
}
