import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectsService  } from '../../../../services/subjects.service';

@Component({
  selector: 'app-edit-subject-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-subject-modal.html',
  styleUrls: ['./edit-subject-modal.css'],
})
export class EditSubjectModal {
  @Input() subject: any | null = null;
  @Output() close = new EventEmitter<{ saved: boolean }>();

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
    icon: '📚',
  };

  constructor(private subjectsService: SubjectsService) {}

  ngOnChanges() {
    if (!this.subject) return;

    this.form = {
      name: this.subject.name || '',
      professor: this.subject.professor || '',
      section: this.subject.section || '',
      university: this.subject.university || '',
      career: this.subject.career || '',
      description: this.subject.description || '',
      color: this.subject.color || '#2563EB',
      icon: this.subject.icon || '📚',
    };
  }

  async save() {
    if (!this.subject?.id) return;

    if (!this.form.name.trim()) {
      this.error = 'El nombre es obligatorio';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.subjectsService.updateSubject(this.subject.id, {
        name: this.form.name.trim(),
        professor: this.form.professor?.trim(),
        section: this.form.section?.trim(),
        university: this.form.university?.trim(),
        career: this.form.career?.trim(),
        description: this.form.description?.trim(),
        color: this.form.color,
        icon: this.form.icon,
      });

      this.close.emit({ saved: true });
    } catch (e) {
      console.error(e);
      this.error = 'No se pudo guardar la materia ';
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.close.emit({ saved: false });
  }
}
