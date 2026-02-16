import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { StudyGuidesService, StudyGuideDoc } from '../../../services/study-guides.service';

@Component({
  selector: 'app-study-guides',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './study-guides.html',
  styleUrl: './study-guides.css',
})
export class StudyGuides implements OnInit {
  guides: StudyGuideDoc[] = [];
  loading = true;
  error = '';

  selectedGuide: StudyGuideDoc | null = null;
  deleteConfirmId: string | null = null;

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
      setTimeout(() => reject(new Error('Tiempo de espera agotado')), 15000),
    );

    try {
      this.guides = await Promise.race([this.studyGuidesService.getMyStudyGuides(), timeout]);
    } catch (e: any) {
      console.error('Error cargando guías:', e);
      this.error = e.message || 'Error al cargar guías';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
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
      this.deleteConfirmId = null;
      if (this.selectedGuide?.id === this.deleteConfirmId) {
        this.selectedGuide = null;
      }
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
