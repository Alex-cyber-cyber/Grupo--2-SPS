import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export interface SendStudyGuideEmailPayload {
  guideName: string;
  subjectName?: string;
  topic?: string;
  text: string;
}

export interface SendStudyGuideEmailResult {
  ok: boolean;
  email: string;
  notificationId: string;
}

@Injectable({
  providedIn: 'root',
})
export class StudyGuideEmailService {
  private readonly functions = inject(Functions);

  async sendStudyGuideEmail(payload: SendStudyGuideEmailPayload): Promise<SendStudyGuideEmailResult> {
    const callable = httpsCallable<SendStudyGuideEmailPayload, SendStudyGuideEmailResult>(
      this.functions,
      'sendStudyGuideEmail',
    );

    const result = await callable(payload);
    return result.data;
  }
}