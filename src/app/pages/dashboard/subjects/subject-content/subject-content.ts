import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Unsubscribe } from 'firebase/firestore';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ContentService } from '../../../../services/subject-contents.service';

type PanelMode = 'create' | 'view' | 'edit';

@Component({
  selector: 'app-subject-content',
  templateUrl: './subject-content.html',
  styleUrls: ['./subject-content.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class SubjectContentComponent implements OnInit, OnDestroy {
  subjectId = '';
  contents = signal<any[]>([]);
  private unsubscribe?: Unsubscribe;

  panelOpen = false;
  panelMode: PanelMode = 'create';
  activeContentId: string | null = null;

  formTitle = '';
  formTags = '';
  formText = '';

  confirmOpen = false;
  pendingDelete: any = null;

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private router: Router
  ) {}

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

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('subjectId');
    if (!id) {
      this.router.navigate(['/dashboard/subjects']);
      return;
    }

    this.subjectId = id;

    this.unsubscribe = this.contentService.observeContents(
      this.subjectId,
      (items) => this.contents.set(items)
    );
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  goBack() {
    window.history.back();
  }

  generateGuide() {
    this.router.navigate(['/ai/generate'], { queryParams: { subjectId: this.subjectId } });
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
      .map(t => t.trim())
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
      return;
    }

    if (this.panelMode === 'edit') {
      if (!this.activeContentId) return;

      await this.contentService.updateTextContent(
        this.subjectId,
        this.activeContentId,
        title,
        text,
        tags
      );

      const updated = this.contents().map(x =>
        x.id === this.activeContentId
          ? { ...x, title, extractedText: text, tags }
          : x
      );
      this.contents.set(updated);

      this.closePanel();
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

    const filtered = this.contents().filter(x => x.id !== this.pendingDelete.id);
    this.contents.set(filtered);

    this.closeConfirm();
  }
}
