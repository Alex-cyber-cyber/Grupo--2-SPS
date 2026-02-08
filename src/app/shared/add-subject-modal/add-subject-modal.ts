import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubjectsService } from '../../services/subjects.service';

@Component({
  selector: 'app-add-subject-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-subject-modal.html',
  styleUrls: ['./add-subject-modal.css'],
})
export class AddSubjectModal implements OnInit {
  subjects: any[] = [];
  selectedSubjectId: string | null = null;
  uid = 'demo-user';

  @Output() close = new EventEmitter<boolean>();

  constructor(private subjectsService: SubjectsService) {}

  async ngOnInit() {
    this.subjects = await this.subjectsService.getActiveSubjects();
  }

  async addSubject() {
    if (!this.selectedSubjectId) return;

    await this.subjectsService.addSubjectToUser(
      this.uid,
      this.selectedSubjectId
    );

    this.close.emit(true);
  }

  cancel() {
    this.close.emit(false);
  }
}
