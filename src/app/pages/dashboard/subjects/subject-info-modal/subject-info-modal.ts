import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-subject-info-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './subject-info-modal.html',
  styleUrls: ['./subject-info-modal.css'],
})
export class SubjectInfoModal {
  @Input({ required: true }) subject: any;

  @Output() close = new EventEmitter<void>();
  @Output() editSubject = new EventEmitter<any>();
  @Output() deleteSubject = new EventEmitter<string>();

  closeModal() {
    this.close.emit();
  }

  edit(ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (!this.subject?.id) return;
    this.editSubject.emit(this.subject);
  }

  delete(ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (!this.subject?.id) return;
    this.deleteSubject.emit(this.subject.id);
  }
}
