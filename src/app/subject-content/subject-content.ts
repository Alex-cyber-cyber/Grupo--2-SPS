import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ContentService } from '../services/subject-contents.service';
import { Unsubscribe } from 'firebase/firestore';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-subject-content',
  templateUrl: './subject-content.html',
  styleUrls: ['./subject-content.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class SubjectContentComponent implements OnInit, OnDestroy {
  subjectId: string = '';
  contents = signal<any[]>([]);

  private unsubscribe?: Unsubscribe;

  showAdd = false;
  selectedType: 'file' | 'text' | null = null;

  // 🔹 Variables de edición
  editingContentId: string | null = null;
  editingTitle = '';
  editingText = '';
  editingTags = '';

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.subjectId = this.route.snapshot.paramMap.get('subjectId')!;

    this.unsubscribe = this.contentService.observeContents(
      this.subjectId,
      (items) => this.contents.set(items)
    );
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  toggleAdd() {
    this.showAdd = !this.showAdd;
    this.selectedType = null;
  }

  selectType(type: 'file' | 'text') {
    this.selectedType = type;
  }

  // 🔹 Subir archivo
  async uploadFileWithInfo(
    fileInput: HTMLInputElement,
    titleInput: HTMLInputElement,
    tagsInput: HTMLInputElement
  ) {
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const title = titleInput.value.trim() || file.name;
    const tags = tagsInput.value
      ? tagsInput.value.split(',').map(t => t.trim())
      : [];

    await this.contentService.uploadFile(
      this.subjectId,
      file,
      title,
      tags
    );

    fileInput.value = '';
    titleInput.value = '';
    tagsInput.value = '';
  }

  // 🔹 Guardar texto
  async pasteTextManual(
    titleInput: HTMLInputElement,
    tagsInput: HTMLInputElement,
    textarea: HTMLTextAreaElement
  ) {
    const title = titleInput.value.trim() || 'Texto';
    const text = textarea.value.trim();
    const tags = tagsInput.value
      ? tagsInput.value.split(',').map(t => t.trim())
      : [];

    if (!text) return;

    await this.contentService.pasteText(
      this.subjectId,
      title,
      text,
      tags
    );

    textarea.value = '';
    titleInput.value = '';
    tagsInput.value = '';
  }

  // 🔹 Abrir contenido
  async openContent(content: any) {
    if (content.storagePath) {
      const url = await this.contentService.getFileURL(
        content.storagePath
      );
      window.open(url);
    } else if (content.extractedText) {
      alert(content.extractedText);
    }
  }

  // 🔹 Editar texto
  startEdit(content: any) {
    this.editingContentId = content.id;
    this.editingTitle = content.title;
    this.editingText = content.extractedText;
    this.editingTags = content.tags?.join(', ') || '';
  }

  cancelEdit() {
    this.editingContentId = null;
  }

  async saveEditedText(content: any) {
    const tags = this.editingTags
      ? this.editingTags.split(',').map(t => t.trim())
      : [];

    await this.contentService.updateTextContent(
      this.subjectId,
      content.id,
      this.editingTitle.trim(),
      this.editingText.trim(),
      tags
    );

    this.editingContentId = null;
  }

  // 🔹 Eliminar
  async deleteContent(content: any) {
    await this.contentService.deleteContent(this.subjectId, content);
  }
}
