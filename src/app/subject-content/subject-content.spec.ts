import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ContentService } from '../services/subject-contents.service';
import { Unsubscribe } from 'firebase/firestore';

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

  private unsubscribe?: Unsubscribe;

  showAdd = false;
  selectedType: 'file' | 'text' | null = null;

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private auth: Auth
  ) {}

 
  ngOnInit() {
    this.subjectId = this.route.snapshot.paramMap.get('subjectId')!;
    
    this.unsubscribe = this.contentService.observeContents(
      this.subjectId,
      (items) => {
        this.contents.set(items);
      }
    );
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }


  async uploadFileWithInfo(
    fileInput: HTMLInputElement,
    titleInput: HTMLInputElement,
    tagsInput: HTMLInputElement
  ) {
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const title = titleInput.value.trim() || file.name;
    const tags = tagsInput.value
      ? tagsInput.value.split(',').map((t) => t.trim())
      : [];

    try {
      await this.contentService.uploadFile(this.subjectId, file, title, tags);
      fileInput.value = '';
      titleInput.value = '';
      tagsInput.value = '';
    } catch (err) {
      console.error('Error subiendo archivo:', err);
    }
  }

 
  async pasteTextManual(
    titleInput: HTMLInputElement,
    tagsInput: HTMLInputElement,
    textarea: HTMLTextAreaElement
  ) {
    const title = titleInput.value.trim() || 'Texto Pegado';
    const text = textarea.value.trim();
    const tags = tagsInput.value
      ? tagsInput.value.split(',').map((t) => t.trim())
      : ['nota'];

    if (!text) return;

    try {
      await this.contentService.pasteText(this.subjectId, title, text, tags);
      textarea.value = '';
      titleInput.value = '';
      tagsInput.value = '';
    } catch (err) {
      console.error('Error pegando texto:', err);
    }
  }

  
  async openContent(content: any) {
    try {
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
      await this.contentService.editContent(
        this.subjectId,
        content.id,
        newTitle,
        newTags
      );
    } catch (err) {
      console.error('Error editando contenido:', err);
    }
  }


  async deleteContent(content: any) {
    try {
      await this.contentService.deleteContent(this.subjectId, content);
    } catch (err) {
      console.error('Error eliminando contenido:', err);
    }
  }

  
  toggleAdd() {
    this.showAdd = !this.showAdd;
    this.selectedType = null;
  }


  selectType(type: 'file' | 'text') {
    this.selectedType = type;
  }
}
