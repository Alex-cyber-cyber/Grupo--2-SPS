import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ContentService } from '../services/subject-contents.service';

@Component({
  selector: 'app-subject-content',
  templateUrl: './subject-content.html',
  styleUrls: ['./subject-content.css'],
  standalone: true,
  imports: [CommonModule],
})
export class SubjectContentComponent implements OnInit, OnDestroy {
  subjectId: string = '';
  contents = signal<any[]>([]);

  private unsubscribe?: () => void;

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.subjectId = this.route.snapshot.paramMap.get('subjectId')!;


    this.unsubscribe = this.contentService.observeContents(this.subjectId, items => {
      this.contents.set(items);
    });
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

 
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      await this.contentService.uploadFile(this.subjectId, file, file.name, ['archivo']);
    } catch (err) {
      console.error('Error subiendo archivo:', err);
    }

    input.value = '';
  }

 
  async pasteText(title: string, text: string, tags: string[] = []) {
    try {
      await this.contentService.pasteText(this.subjectId, title, text, tags);
    } catch (err) {
      console.error('Error pegando texto:', err);
    }
  }

  pasteTextFromTextarea(textarea: HTMLTextAreaElement) {
    const text = textarea.value.trim();
    if (!text) return;
    this.pasteText('Texto Pegado', text, ['nota']);
    textarea.value = '';
  }

  
  async addNewContent(titleInput: HTMLInputElement, tagsInput: HTMLInputElement) {
    const title = titleInput.value.trim();
    const tags = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()) : [];

    if (!title) return;

    try {
      await this.pasteText(title, title, tags);
      titleInput.value = '';
      tagsInput.value = '';
    } catch (err) {
      console.error('Error creando contenido:', err);
    }
  }

 
  async openContent(content: any) {
    try {
      await this.contentService.triggerEvent(this.subjectId, content.id, 'content_opened');

      if (content.storagePath) {
        const url = await this.contentService.getFileURL(content.storagePath);
        window.open(url);
      } else if (content.extractedText) {
        alert(content.extractedText);
      }
    } catch (err) {
      console.error('Error abriendo contenido:', err);
    }
  }

 
  async editContent(content: any, newTitle: string, newTags: string[]) {
    try {
      await this.contentService.editContent(this.subjectId, content.id, newTitle, newTags);
    } catch (err) {
      console.error('Error editando contenido:', err);
    }
  }

  async deleteContent(content: any) {
    try {
      await this.contentService.deleteContent(this.subjectId, content);
      await this.contentService.triggerEvent(this.subjectId, content.id, 'content_deleted');
    } catch (err) {
      console.error('Error eliminando contenido:', err);
    }
  }
}
