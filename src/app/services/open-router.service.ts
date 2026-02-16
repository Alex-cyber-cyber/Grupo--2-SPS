import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

export type ExamDifficulty = 'basico' | 'intermedio' | 'avanzado';

export type ExamQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'problem'
  | 'essay';

export type ExamQuestion = {
  id: string;
  type: ExamQuestionType;
  prompt: string;
  points: number;
  choices?: Array<string>;
  correctAnswer?: string;
  correctChoiceIndex?: number;
  explanation?: string;
};

export type GeneratedExam = {
  title: string;
  durationMinutes: number;
  totalPoints: number;
  instructions: Array<string>;
  questions: Array<ExamQuestion>;
};

export type StudyGuideQAItem = {
  question: string;
  answer: string;
};

export type GeneratedStudyGuide = {
  title: string;
  overview?: string;
  qa: Array<StudyGuideQAItem>;
  keyConcepts?: Array<string>;
  sections?: Array<{
    heading: string;
    bullets: Array<string>;
    miniExercises?: Array<string>;
  }>;
  commonMistakes?: Array<string>;
  flashcards?: Array<{ front: string; back: string }>;
};

export type GenerateFromStudentContentRequest = {
  apiKey: string;
  studentContent: string;
  topicHint?: string;
  difficulty?: ExamDifficulty;
  questionCount?: number;
  durationMinutes?: number;
  model?: string;
};

export type GeneratedStudyGuideResponse = {
  language: 'es';
  topic: string;
  difficulty: ExamDifficulty;
  assumptions: Array<string>;
  studyGuide: GeneratedStudyGuide;
};

export type GeneratedExamResponse = {
  language: 'es';
  topic: string;
  difficulty: ExamDifficulty;
  assumptions: Array<string>;
  exam: GeneratedExam;
};

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable({
  providedIn: 'root',
})
export class OpenRouterService {
  private readonly http = inject(HttpClient);

  private getOriginForHeaders(): string | null {
    if (typeof window === 'undefined') return null;
    return window.location?.origin ?? null;
  }

  private parseJsonFromModelContent(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(content.slice(start, end + 1));
      }
      throw new Error('Respuesta inválida: el modelo no devolvió JSON.');
    }
  }

  private async callOpenRouter<T>(params: {
    apiKey: string;
    model: string;
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<T> {
    const origin = this.getOriginForHeaders();
    let headers = new HttpHeaders({
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Proyecto Vanguardia',
    });

    if (origin) headers = headers.set('HTTP-Referer', origin);

    const body = {
      model: params.model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: params.maxTokens,
    };

    let response: OpenRouterChatCompletionResponse;
    try {
      response = await firstValueFrom(
        this.http
          .post<OpenRouterChatCompletionResponse>(
            'https://openrouter.ai/api/v1/chat/completions',
            body,
            { headers },
          )
          .pipe(timeout({ first: 45000 })),
      );
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 0) {
          throw new Error(
            'No se pudo completar la solicitud a OpenRouter (posible CORS, bloqueo del navegador o problema de red).',
          );
        }
        const message =
          (typeof e.error === 'object' && e.error && 'error' in e.error
            ? (e.error as any).error?.message
            : undefined) ?? e.message;
        throw new Error(message);
      }
      if (e instanceof Error && e.name === 'TimeoutError') {
        throw new Error('Tiempo de espera agotado al llamar a OpenRouter.');
      }
      throw e;
    }

    if (response?.error?.message) throw new Error(response.error.message);

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('El modelo no devolvió contenido.');
    }

    return this.parseJsonFromModelContent(content) as T;
  }

  async generateStudyGuide(
    request: GenerateFromStudentContentRequest,
  ): Promise<GeneratedStudyGuideResponse> {
    const studentContent = (request.studentContent ?? '').trim();
    if (!studentContent) throw new Error('studentContent requerido');

    const questionCount = request.questionCount ?? 15;
    const durationMinutes = request.durationMinutes ?? 60;
    const topicHint = (request.topicHint ?? '').trim();
    const model = (request.model ?? 'openai/gpt-4o-mini').trim();

    const system = [
      'Eres un generador de material educativo.',
      'Responde SOLO con un objeto JSON válido (sin Markdown, sin texto extra).',
      'Idioma: español.',
      'Basate únicamente en el contenido provisto; si falta información, agrega supuestos explícitos en assumptions.',
      'Genera una guía de estudio en formato Pregunta/Respuesta para estudiar para un examen.',
    ].join(' ');

    const user =
      'Contenido del estudiante (texto):\n' +
      studentContent +
      '\n\nRequisitos:\n' +
      `- Cantidad de preguntas de práctica sugeridas: ${questionCount}\n` +
      `- Duración objetivo (min): ${durationMinutes}\n` +
      (topicHint ? `- Pista de tema/título: ${topicHint}\n` : '') +
      '- La guía DEBE incluir preguntas y respuestas directas, útiles para memorizar y practicar.\n' +
      `- Incluye exactamente ${questionCount} items en qa (Pregunta/Respuesta).\n` +
      '- Respuestas: claras, cortas y precisas; si aplica, incluye un mini-ejemplo en 1 línea.\n' +
      '\nFormato de salida (JSON):\n' +
      '{\n' +
      '  "language": "es",\n' +
      '  "topic": string,\n' +
      '  "difficulty": "basico"|"intermedio"|"avanzado",\n' +
      '  "assumptions": string[],\n' +
      '  "studyGuide": {\n' +
      '    "title": string,\n' +
      '    "overview": string,\n' +
      '    "qa": [{"question": string, "answer": string}]\n' +
      '  }\n' +
      '}';

    return await this.callOpenRouter<GeneratedStudyGuideResponse>({
      apiKey: request.apiKey,
      model,
      system,
      user,
      maxTokens: 2200,
    });
  }

  async generateExam(request: GenerateFromStudentContentRequest): Promise<GeneratedExamResponse> {
    const studentContent = (request.studentContent ?? '').trim();
    if (!studentContent) throw new Error('studentContent requerido');

    const difficulty = request.difficulty ?? 'intermedio';
    const questionCount = request.questionCount ?? 15;
    const durationMinutes = request.durationMinutes ?? 60;
    const topicHint = (request.topicHint ?? '').trim();
    const model = (request.model ?? 'openai/gpt-4o-mini').trim();

    const system = [
      'Eres un generador de material educativo.',
      'Responde SOLO con un objeto JSON válido (sin Markdown, sin texto extra).',
      'Idioma: español.',
      'Basate únicamente en el contenido provisto; si falta información, agrega supuestos explícitos en assumptions.',
      'Genera un examen evaluable con clave de respuestas.',
      'IMPORTANTE: Solo genera preguntas de tipo "multiple_choice" o "true_false" para que puedan ser evaluadas automáticamente.',
    ].join(' ');

    const user =
      'Contenido del estudiante (texto):\n' +
      studentContent +
      '\n\nRequisitos:\n' +
      `- Dificultad: ${difficulty}\n` +
      `- Cantidad de preguntas: ${questionCount}\n` +
      `- Duración (min): ${durationMinutes}\n` +
      (topicHint ? `- Pista de tema/título: ${topicHint}\n` : '') +
      '\nFormato de salida (JSON):\n' +
      '{\n' +
      '  "language": "es",\n' +
      '  "topic": string,\n' +
      '  "difficulty": "basico"|"intermedio"|"avanzado",\n' +
      '  "assumptions": string[],\n' +
      '  "exam": {\n' +
      '    "title": string,\n' +
      '    "durationMinutes": number,\n' +
      '    "totalPoints": number,\n' +
      '    "instructions": string[],\n' +
      '    "questions": [{\n' +
      '      "id": string,\n' +
      '      "type": "multiple_choice"|"true_false",\n' +
      '      "prompt": string,\n' +
      '      "points": number,\n' +
      '      "choices"?: string[],\n' +
      '      "correctChoiceIndex"?: number,\n' +
      '      "correctAnswer"?: string,\n' +
      '      "explanation"?: string\n' +
      '    }]\n' +
      '  }\n' +
      '}\n' +
      '\nReglas:\n' +
      '- Asegura que totalPoints sea la suma de points.\n' +
      '- En multiple_choice incluye choices (4 opciones) y correctChoiceIndex (0-based).\n' +
      '- En true_false usa correctAnswer con "Verdadero" o "Falso".\n' +
      '- Incluye explicaciones cortas para la clave.\n' +
      '- NO uses short_answer, problem ni essay. Solo multiple_choice y true_false.';

    return await this.callOpenRouter<GeneratedExamResponse>({
      apiKey: request.apiKey,
      model,
      system,
      user,
      maxTokens: 2500,
    });
  }
}
