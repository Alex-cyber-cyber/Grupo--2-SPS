import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { StudyGuidesService, StudyGuideDoc } from '../../../services/study-guides.service';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-study-guides',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './study-guides.html',
  styleUrl: './study-guides.css',
})
export class StudyGuides implements OnInit {
  guides: StudyGuideDoc[] = [];
  filtered: StudyGuideDoc[] = [];
  loading = true;
  error = '';

  selectedGuide: StudyGuideDoc | null = null;
  deleteConfirmId: string | null = null;
  selectedTopic: string = '';
  topics: string[] = [];

  constructor(
    private studyGuidesService: StudyGuidesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadGuides();
  }

    async loadGuides(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Tiempo de espera agotado')),15000),
    );

      try {
      this.guides = await Promise.race([
        this.studyGuidesService.getMyStudyGuides(),
        timeout
      ]);
      this.filtered = this.guides;
      this.loadTopics();

    } catch (e: any) {
      console.error('Error cargando guías:', e);
      this.error = e.message || 'Error al cargar guías';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
       loadTopics(): void {
       const topics = this.guides
       .map(g => g.topic)
       .filter((t): t is string => !!t);
       this.topics = Array.from(new Set<string>(topics));
}
     updateFilter(): void {
  if (!this.selectedTopic) {
    this.filtered = this.guides;
  } else {
    this.filtered = this.guides.filter(g => g.topic === this.selectedTopic);
  }
}
  openGuide(guide: StudyGuideDoc): void {
    this.selectedGuide = guide;
  }

  closeGuide(): void {
    this.selectedGuide = null;
  }

  confirmDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  async doDelete(): Promise<void> {
    if (!this.deleteConfirmId) return;
    try {
      await this.studyGuidesService.deleteStudyGuide(this.deleteConfirmId);
      this.guides = this.guides.filter((g) => g.id !== this.deleteConfirmId);
      this.updateFilter();
      this.loadTopics();
      this.deleteConfirmId = null;
      if (this.selectedGuide?.id === this.deleteConfirmId) {
        this.selectedGuide = null;
      }
      this.cdr.detectChanges();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    }
  }

      formatDate(d: Date): string {
      return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}