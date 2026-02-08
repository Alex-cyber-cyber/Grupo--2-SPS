import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subject-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subject-card.html',
  styleUrls: ['./subject-card.css'],
})
export class SubjectCardComponent {
  @Input() subject: any;

  @Output() open = new EventEmitter<string>();
  @Output() generate = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  openSubject() {
    this.open.emit(this.subject.id);
  }

  generateGuide() {
    this.generate.emit(this.subject.id);
  }

  removeSubject() {
    this.remove.emit(this.subject.id);
  }
}
