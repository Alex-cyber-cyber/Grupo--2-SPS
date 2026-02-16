import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  GeneratedExamResponse,
  GeneratedStudyGuideResponse,
  OpenRouterService,
} from '../../../services/open-router.service';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './generate.html',
  styleUrls: ['./generate.css'],
})
export class Generate implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly firestore = inject(Firestore);
  private readonly fb = inject(FormBuilder);
  private readonly openRouter = inject(OpenRouterService);

  subject: any = null;
  loading = true;

  generatingStudyGuide = false;
  generatingExam = false;
  error: string | null = null;

  studyGuide: GeneratedStudyGuideResponse | null = null;
  exam: GeneratedExamResponse | null = null;

  readonly form = this.fb.nonNullable.group({
    apiKey: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(10)],
    }),
    rememberApiKey: this.fb.nonNullable.control(true),
    model: this.fb.nonNullable.control('openai/gpt-4o-mini', { validators: [Validators.required] }),
    topicHint: this.fb.nonNullable.control('', { validators: [Validators.maxLength(140)] }),
    questionCount: this.fb.nonNullable.control(15, {
      validators: [Validators.min(5), Validators.max(40)],
    }),
    durationMinutes: this.fb.nonNullable.control(60, {
      validators: [Validators.min(15), Validators.max(180)],
    }),
    studentContent: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(50)],
    }),
  });

  async ngOnInit() {
    const saved = localStorage.getItem('openrouter_api_key');
    if (saved) this.form.controls.apiKey.setValue(saved);

    const subjectId = this.route.snapshot.queryParamMap.get('subjectId');
    if (subjectId) {
      const ref = doc(this.firestore, `subjects/${subjectId}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        this.subject = { id: snap.id, ...snap.data() };
        const name = String((this.subject as any)?.name ?? '').trim();
        if (name) this.form.controls.topicHint.setValue(name);
      }
    }

    this.loading = false;
  }

  private persistApiKey() {
    if (!this.form.controls.rememberApiKey.value) {
      localStorage.removeItem('openrouter_api_key');
      return;
    }

    const value = this.form.controls.apiKey.value.trim();
    if (value) localStorage.setItem('openrouter_api_key', value);
  }

  async generateStudyGuide() {
    if (this.generatingStudyGuide || this.generatingExam) return;
    this.error = null;
    this.studyGuide = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.generatingStudyGuide = true;
    try {
      this.persistApiKey();
      const v = this.form.getRawValue();
      this.studyGuide = await this.openRouter.generateStudyGuide({
        apiKey: v.apiKey,
        model: v.model,
        studentContent: v.studentContent,
        topicHint: v.topicHint,
        questionCount: v.questionCount,
        durationMinutes: v.durationMinutes,
      });
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error desconocido';
    } finally {
      this.generatingStudyGuide = false;
    }
  }

  async generateExam() {
    if (this.generatingStudyGuide || this.generatingExam) return;
    this.error = null;
    this.exam = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.generatingExam = true;
    try {
      this.persistApiKey();
      const v = this.form.getRawValue();
      this.exam = await this.openRouter.generateExam({
        apiKey: v.apiKey,
        model: v.model,
        studentContent: v.studentContent,
        topicHint: v.topicHint,
        questionCount: v.questionCount,
        durationMinutes: v.durationMinutes,
      });
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error desconocido';
    } finally {
      this.generatingExam = false;
    }
  }
}
