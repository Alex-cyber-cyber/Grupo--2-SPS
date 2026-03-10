import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectorRef,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Unsubscribe } from 'firebase/firestore';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, getDoc, collection, getDocs, query, where } from '@angular/fire/firestore';
import { filter } from 'rxjs/operators';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ContentService } from '../../../../services/subject-contents.service';
import { StudyGuidesService } from '../../../../services/study-guides.service';
import { ExamsService } from '../../../../services/exams.service';
import { EventsService } from '../../../../services/events/events.service';
import {
  ExamDifficulty,
  GeneratedExamResponse,
  GeneratedStudyGuideResponse,
  OpenRouterService,
} from '../../../../services/open-router.service';

type PanelMode = 'create' | 'view' | 'edit';

@Component({
  selector: 'app-subject-content',
  templateUrl: './subject-content.html',
  styleUrls: ['./subject-content.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class SubjectContentComponent implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly contentService = inject(ContentService);
  private readonly router = inject(Router);
  private readonly firestore = inject(Firestore);
  private readonly openRouter = inject(OpenRouterService);
  private readonly studyGuides = inject(StudyGuidesService);
  private readonly examsService = inject(ExamsService);
  private readonly eventsService = inject(EventsService);

  subjectId = '';
  subjectName = '';
  contents = signal<any[]>([]);
  private unsubscribe?: Unsubscribe;
  private navSub?: any;
  private paramSub?: any;

  private lastNonEmptyContents: any[] = [];
  private contentsInitialized = false;

  panelOpen = false;
  panelMode: PanelMode = 'create';
  activeContentId: string | null = null;

  formTitle = '';
  formTags = '';
  formText = '';

  confirmOpen = false;
  pendingDelete: any = null;

  generatingStudyGuide = false;
  generatingExam = false;
  aiError: string | null = null;
  studyGuide: GeneratedStudyGuideResponse | null = null;
  exam: GeneratedExamResponse | null = null;

  nameModalOpen = false;
  nameDraft = '';
  lastSavedStudyGuideId: string | null = null;

  examModalOpen = false;
  examNameDraft = '';
  examDifficultyDraft: ExamDifficulty = 'intermedio';
  lastSavedExamId: string | null = null;

  private readonly defaultModel = 'openai/gpt-4o-mini';

  private refreshView() {
    try {
      this.cdr.detectChanges();
    } catch {}
  }

  private setContentsSafely(items: any[]) {
    const arr = Array.isArray(items) ? items : [];

    if (arr.length > 0) {
      this.lastNonEmptyContents = arr;
      this.contents.set(arr);
      this.contentsInitialized = true;
      this.refreshView();
      return;
    }

    if (!this.contentsInitialized) {
      this.contents.set([]);
      this.contentsInitialized = true;
      this.refreshView();
      return;
    }

    if (this.lastNonEmptyContents.length > 0) {
      this.contents.set(this.lastNonEmptyContents);
      this.refreshView();
      return;
    }

    this.contents.set([]);
    this.refreshView();
  }

  private resubscribeContents() {
    if (!this.subjectId) return;

    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch {}
      this.unsubscribe = undefined;
    }

    this.unsubscribe = this.contentService.observeContents(this.subjectId, (items) => {
      this.zone.run(() => this.setContentsSafely(items));
    });
  }

  private async loadSubjectName() {
    const snap = await getDoc(doc(this.firestore, `subjects/${this.subjectId}`));
    if (snap.exists()) {
      const data: any = snap.data();
      const name = String(data?.name ?? '').trim();
      this.zone.run(() => {
        this.subjectName = name;
        this.refreshView();
      });
    }
  }

  get isView() {
    return this.panelMode === 'view';
  }

  get isEdit() {
    return this.panelMode === 'edit';
  }

  get panelTitle() {
    if (this.panelMode === 'edit') return 'Editar contenido';
    if (this.panelMode === 'view') return 'Ver contenido';
    return 'Agregar contenido';
  }

  get panelSubtitle() {
    if (this.panelMode === 'edit') return 'Actualiza la información del texto';
    if (this.panelMode === 'view') return 'Visualiza la información del texto';
    return 'Registra un texto para esta materia';
  }

  async ngOnInit() {
    this.paramSub = this.route.paramMap.subscribe(async (pm) => {
      const id = pm.get('subjectId');
      if (!id) {
        this.router.navigate(['/dashboard/subjects']);
        return;
      }

      const changed = this.subjectId !== id;
      this.subjectId = id;
      void this.eventsService.trackSubjectOpened(this.subjectId);

      if (changed) {
        this.contentsInitialized = false;
        this.lastNonEmptyContents = [];
        this.contents.set([]);
        this.refreshView();
      }

      await this.loadSubjectName();
      this.resubscribeContents();
      this.zone.run(() => this.refreshView());
    });

    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.zone.run(() => {
          this.resubscribeContents();
          this.refreshView();
        });
      });
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch {}
    }
    if (this.navSub) {
      try {
        this.navSub.unsubscribe();
      } catch {}
    }
    if (this.paramSub) {
      try {
        this.paramSub.unsubscribe();
      } catch {}
    }
  }

  goBack() {
    window.history.back();
  }

  private buildStudentContentFromContents(): string {
    const items = this.contents();

    const parts = items
      .map((c, idx) => {
        const title = String(c?.title ?? `Texto ${idx + 1}`).trim();
        const text = String(c?.extractedText ?? '').trim();
        if (!text) return null;

        const tags = Array.isArray(c?.tags) && c.tags.length ? `Tags: ${c.tags.join(', ')}` : '';

        return `### ${title}\n${tags}\n\n${text}`.trim();
      })
      .filter(Boolean) as string[];

    return parts.join('\n\n---\n\n');
  }

  private studyGuideToText(response: GeneratedStudyGuideResponse): string {
    const title = (response?.studyGuide?.title || '').trim();
    const overview = (response?.studyGuide?.overview || '').trim();
    const topic = (response?.topic || '').trim();

    const lines: string[] = [];
    if (title) lines.push(title);
    if (topic) lines.push(`Tema: ${topic}`);
    if (overview) {
      lines.push('');
      lines.push(overview);
    }

    lines.push('');
    (response.studyGuide.qa || []).forEach((item, idx) => {
      const q = (item?.question || '').trim();
      const a = (item?.answer || '').trim();
      if (!q && !a) return;
      lines.push(`${idx + 1}. Pregunta: ${q}`.trim());
      lines.push(`Respuesta: ${a}`.trim());
      lines.push('');
    });

    return lines.join('\n').trim();
  }

  private baseGuideName(): string {
    const base = (this.subjectName || '').trim();
    return base || 'Guía';
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private formatGuideName(version: number): string {
    const v = String(version).padStart(2, '0');
    return `${this.baseGuideName()} ${v}`;
  }

  private async computeNextGuideVersion(): Promise<number> {
    
    const base = this.baseGuideName();
    const guidesCol = collection(this.firestore, 'studyGuides');
    const qRef = query(guidesCol, where('subjectId', '==', this.subjectId));
    const snap = await getDocs(qRef);

    const rx = new RegExp(`^${this.escapeRegex(base)}\\s+(\\d{2,})$`);
    let max = 0;

    snap.forEach((d) => {
      const name = String((d.data() as any)?.name ?? '').trim();
      const m = name.match(rx);
      if (!m) return;
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    });

    return max + 1;
  }
  // ================= VERSIONADO DE EXAMENES =================

private baseExamName(): string {
  const base = (this.subjectName || '').trim();
  return base || 'Examen';
}

private formatExamName(version: number): string {
  const v = String(version).padStart(2, '0');
  return `${this.baseExamName()} ${v}`;
}

private async computeNextExamVersion(): Promise<number> {
  const base = this.baseExamName();

  const examsCol = collection(this.firestore, 'exams');
  const qRef = query(examsCol, where('subjectId', '==', this.subjectId));
  const snap = await getDocs(qRef);

  const rx = new RegExp(`^${this.escapeRegex(base)}\\s+(\\d{2,})$`);

  let max = 0;

  snap.forEach((d) => {
    const name = String((d.data() as any)?.name ?? '').trim();
    const m = name.match(rx);
    if (!m) return;

    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  });

  return max + 1;
}

  async openStudyGuideNameModal() {
    this.zone.run(() => {
      this.aiError = null;
      this.lastSavedStudyGuideId = null;
      this.nameDraft = '';
      this.nameModalOpen = true;
      this.refreshView();
    });

    let next = 1;
    try {
      next = await this.computeNextGuideVersion();
    } catch {
      next = 1;
    }

    this.zone.run(() => {
      this.nameDraft = this.formatGuideName(next);
      this.refreshView();
    });
  }

  closeStudyGuideNameModal() {
    this.zone.run(() => {
      this.nameModalOpen = false;
      this.refreshView();
    });
  }

  async confirmStudyGuideNameAndGenerate() {
    if (this.generatingStudyGuide || this.generatingExam) return;

    this.zone.run(() => {
      this.nameModalOpen = false;
      this.aiError = null;
      this.studyGuide = null;
      this.lastSavedStudyGuideId = null;
      this.generatingStudyGuide = true;
      this.refreshView();
    });

    let version = 1;
    try {
      version = await this.computeNextGuideVersion();
    } catch {
      version = 1;
    }

    const name = this.formatGuideName(version);
    await this.generateStudyGuideFromContents(name);
  }

  private async generateStudyGuideFromContents(name: string) {
    if (this.generatingExam) return;

    const apiKey = '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';

    const studentContent = this.buildStudentContentFromContents();
    if (studentContent.length < 50) {
      this.zone.run(() => {
        this.aiError = 'No hay contenido suficiente para generar la guía.';
        this.generatingStudyGuide = false;
        this.refreshView();
      });
      return;
    }

    try {
      const result = await this.openRouter.generateStudyGuide({
        apiKey,
        model: this.defaultModel,
        studentContent,
        topicHint: this.subjectName || undefined,
        questionCount: 15,
        durationMinutes: 60,
      });

      this.zone.run(() => {
        this.studyGuide = result;
        this.refreshView();
      });

      const text = this.studyGuideToText(result);

      const savedId = await this.studyGuides.createStudyGuide({
        name,
        text,
        subjectId: this.subjectId,
        topic: result.topic,
      });

      this.zone.run(() => {
        this.lastSavedStudyGuideId = savedId;
        this.refreshView();
      });
    } catch (e) {
      this.zone.run(() => {
        this.aiError = e instanceof Error ? e.message : 'Error desconocido';
        this.refreshView();
      });
    } finally {
      this.zone.run(() => {
        this.generatingStudyGuide = false;
        this.refreshView();
      });
      this.resubscribeContents();
    }
  }

async openExamModal() {
  this.aiError = null;
  this.lastSavedExamId = null;
  this.examNameDraft = '';
  this.examDifficultyDraft = 'intermedio';
  this.examModalOpen = true;
  this.refreshView();

  let next = 1;

  try {
    next = await this.computeNextExamVersion();
  } catch {
    next = 1;
  }

  this.examNameDraft = this.formatExamName(next);
  this.refreshView();
}

  closeExamModal() {
    this.examModalOpen = false;
    this.refreshView();
  }

async confirmExamAndGenerate() {

  let version = 1;

  try {
    version = await this.computeNextExamVersion();
  } catch {
    version = 1;
  }

  const name = this.formatExamName(version);

  if (!name) {
    this.aiError = 'Ponle un nombre al examen.';
    this.refreshView();
    return;
  }

  if (this.generatingStudyGuide || this.generatingExam) return;

  this.zone.run(() => {
    this.examModalOpen = false;
    this.aiError = null;
    this.exam = null;
    this.lastSavedExamId = null;
    this.generatingExam = true;
    this.refreshView();
  });

  await this.generateExamFromContents(name, this.examDifficultyDraft);
}

  private async generateExamFromContents(name: string, difficulty: ExamDifficulty) {
    if (this.generatingStudyGuide) return;

    this.aiError = null;
    this.exam = null;
    this.lastSavedExamId = null;



    const apiKey = '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';

    const studentContent = this.buildStudentContentFromContents();
    if (studentContent.length < 50) {
      this.zone.run(() => {
        this.aiError = 'No hay contenido suficiente para generar el examen.';
        this.generatingExam = false;
        this.refreshView();
      });
      return;
    }

    try {
      const result = await this.openRouter.generateExam({
        apiKey,
        model: this.defaultModel,
        studentContent,
        topicHint: this.subjectName || undefined,
        difficulty,
        questionCount: 15,
        durationMinutes: 60,
      });

      this.zone.run(() => {
        this.exam = result;
        this.refreshView();
      });

      const savedId = await this.examsService.createExam({
        name,
        topic: result.topic,
        difficulty: result.difficulty,
        subjectId: this.subjectId,
        exam: result.exam,
      });

      this.zone.run(() => {
        this.lastSavedExamId = savedId;
        this.refreshView();
      });
    } catch (e) {
      this.zone.run(() => {
        this.aiError = e instanceof Error ? e.message : 'Error desconocido';
        this.refreshView();
      });
    } finally {
      this.zone.run(() => {
        this.generatingExam = false;
        this.refreshView();
      });
      this.resubscribeContents();
    }
  }

  openCreate() {
    this.panelMode = 'create';
    this.panelOpen = true;
    this.activeContentId = null;
    this.formTitle = '';
    this.formTags = '';
    this.formText = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openView(content: any) {
    this.panelMode = 'view';
    this.panelOpen = true;
    this.activeContentId = content?.id ?? null;
    this.formTitle = content?.title ?? '';
    this.formTags = Array.isArray(content?.tags) ? content.tags.join(', ') : '';
    this.formText = content?.extractedText ?? '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openEdit(content: any) {
    this.panelMode = 'edit';
    this.panelOpen = true;
    this.activeContentId = content?.id ?? null;
    this.formTitle = content?.title ?? '';
    this.formTags = Array.isArray(content?.tags) ? content.tags.join(', ') : '';
    this.formText = content?.extractedText ?? '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closePanel() {
    this.panelOpen = false;
    this.activeContentId = null;
  }

  private parseTags(raw: string): string[] {
    return (raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async savePanel() {
    const title = (this.formTitle || '').trim() || 'Texto';
    const text = (this.formText || '').trim();
    const tags = this.parseTags(this.formTags);

    if (!text) return;

    if (this.panelMode === 'create') {
      await this.contentService.pasteText(this.subjectId, title, text, tags);
      this.closePanel();
      this.resubscribeContents();
      return;
    }

    if (this.panelMode === 'edit') {
      if (!this.activeContentId) return;

      await this.contentService.updateTextContent(this.subjectId, this.activeContentId, title, text, tags);

      const updated = this.contents().map((x) =>
        x.id === this.activeContentId ? { ...x, title, extractedText: text, tags } : x,
      );
      this.contents.set(updated);

      this.closePanel();
      this.resubscribeContents();
      return;
    }
  }

  askDelete(content: any) {
    this.pendingDelete = content;
    this.confirmOpen = true;
  }

  closeConfirm() {
    this.confirmOpen = false;
    this.pendingDelete = null;
  }

  async confirmDelete() {
    if (!this.pendingDelete) return;

    await this.contentService.deleteContent(this.subjectId, this.pendingDelete);

    const filtered = this.contents().filter((x) => x.id !== this.pendingDelete.id);
    this.contents.set(filtered);

    this.closeConfirm();
    this.resubscribeContents();
  }
}
