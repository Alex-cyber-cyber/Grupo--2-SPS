import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ContentsService, ContentDoc } from '../../../services/contents.service';
import { EventsService } from '../../../services/events/events.service';
import { EVENTS } from '../../../services/events/events.constants';

@Component({
  selector: 'app-subject-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subject-content.html',
  styleUrl: './subject-content.css',
})
export class SubjectContent {
  subjectId = '';
contents$!: ReturnType<ContentsService['listMyBySubject']>;

  // Upload
  uploadTitle = '';
  uploadTags = '';
  selectedFile: File | null = null;

  // Paste text
  textTitle = '';
  textTags = '';
  pastedText = '';

  // UI state
  busy = signal(false);
  openId = signal<string | null>(null);

  editId = signal<string | null>(null);
  editTitle = '';
  editTags = '';

  constructor(
  private route: ActivatedRoute,
  private contentsService: ContentsService,
  private events: EventsService
) {
  this.subjectId = this.route.snapshot.paramMap.get('subjectId') || '';
  this.contents$ = this.contentsService.listMyBySubject(this.subjectId);
}


  private parseTags(raw: string): string[] {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;

    if (this.selectedFile && !this.uploadTitle.trim()) {
      this.uploadTitle = this.selectedFile.name;
    }
  }

  async upload() {
    if (!this.selectedFile) return;

    try {
      this.busy.set(true);

      const docRef = await this.contentsService.uploadFile(
        this.subjectId,
        this.selectedFile,
        this.uploadTitle.trim() || this.selectedFile.name,
        this.parseTags(this.uploadTags)
      );

      this.events.track(EVENTS.CONTENT_UPLOADED, {
        subjectId: this.subjectId,
        contentId: docRef.id,
        type: 'file',
      });

      this.selectedFile = null;
      this.uploadTitle = '';
      this.uploadTags = '';
      alert('Archivo subido ✅');
    } catch (e: any) {
      alert(e?.message ?? 'Error al subir');
    } finally {
      this.busy.set(false);
    }
  }

  async saveText() {
    if (!this.pastedText.trim()) return;

    try {
      this.busy.set(true);

      const docRef = await this.contentsService.createFromText(
        this.subjectId,
        this.textTitle.trim() || 'Texto pegado',
        this.parseTags(this.textTags),
        this.pastedText.trim()
      );

      this.events.track(EVENTS.CONTENT_UPLOADED, {
        subjectId: this.subjectId,
        contentId: docRef.id,
        type: 'text',
      });

      this.textTitle = '';
      this.textTags = '';
      this.pastedText = '';
      alert('Texto guardado ✅');
    } catch (e: any) {
      alert(e?.message ?? 'Error al guardar texto');
    } finally {
      this.busy.set(false);
    }
  }

  open(c: ContentDoc) {
    const next = this.openId() === c.id ? null : (c.id || null);
    this.openId.set(next);

    if (next && c.id) {
      this.events.track(EVENTS.CONTENT_OPENED, {
        subjectId: this.subjectId,
        contentId: c.id,
      });
    }
  }

  startEdit(c: ContentDoc) {
    this.editId.set(c.id || null);
    this.editTitle = c.title;
    this.editTags = (c.tags || []).join(', ');
  }

  cancelEdit() {
    this.editId.set(null);
    this.editTitle = '';
    this.editTags = '';
  }

  async saveEdit(c: ContentDoc) {
    if (!c.id) return;

    try {
      this.busy.set(true);

      await this.contentsService.updateMeta(c.id, {
        title: this.editTitle.trim() || c.title,
        tags: this.parseTags(this.editTags),
      });

      this.events.track(EVENTS.CONTENT_UPDATED, {
        subjectId: this.subjectId,
        contentId: c.id,
      });

      this.cancelEdit();
      alert('Actualizado ✅');
    } catch (e: any) {
      alert(e?.message ?? 'Error al actualizar');
    } finally {
      this.busy.set(false);
    }
  }

  async remove(c: ContentDoc) {
    if (!confirm('¿Eliminar este contenido?')) return;

    try {
      this.busy.set(true);

      await this.contentsService.deleteContent(c);

      this.events.track(EVENTS.CONTENT_DELETED, {
        subjectId: this.subjectId,
        contentId: c.id,
        hadStorage: !!c.storagePath,
      });

      alert('Eliminado ✅');
    } catch (e: any) {
      alert(e?.message ?? 'Error al eliminar');
    } finally {
      this.busy.set(false);
    }
  }
}
