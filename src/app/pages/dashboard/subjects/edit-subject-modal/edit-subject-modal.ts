import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SubjectsService } from '../../../../services/subjects.service';

@Component({
  selector: 'app-edit-subject-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-subject-modal.html',
  styleUrls: ['./edit-subject-modal.css'],
})
export class EditSubjectModal {
  @Input() subject: any | null = null;
  @Output() close = new EventEmitter<{ saved: boolean; subject?: any }>();

  loading = false;
  error = '';

  form = {
    name: '',
    professor: '',
    section: '',
    university: '',
    career: '',
    description: '',
    color: '#2563EB',
    icon: '\uD83D\uDCDA',
  };

  constructor(private subjectsService: SubjectsService) {}

  ngOnChanges(): void {
    if (!this.subject) return;

    this.form = {
      name: this.subject.name || '',
      professor: this.subject.professor || '',
      section: this.subject.section || '',
      university: this.subject.university || '',
      career: this.subject.career || '',
      description: this.subject.description || '',
      color: this.subject.color || '#2563EB',
      icon: this.subject.icon || '\uD83D\uDCDA',
    };
  }

  async save(): Promise<void> {
    if (!this.subject?.id) return;

    if (!this.form.name.trim()) {
      this.error = 'El nombre es obligatorio';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const changes = {
        name: this.form.name.trim(),
        professor: this.form.professor?.trim(),
        section: this.form.section?.trim(),
        university: this.form.university?.trim(),
        career: this.form.career?.trim(),
        description: this.form.description?.trim(),
        color: this.form.color,
        icon: this.form.icon,
      };

      await this.subjectsService.updateSubject(this.subject.id, changes);

      this.close.emit({
        saved: true,
        subject: {
          ...(this.subject || {}),
          ...changes,
          id: this.subject.id,
        },
      });
    } catch (e) {
      console.error(e);
      this.error = 'No se pudo guardar la materia';
    } finally {
      this.loading = false;
    }
  }

  cancel(): void {
    this.close.emit({ saved: false });
  }
}
