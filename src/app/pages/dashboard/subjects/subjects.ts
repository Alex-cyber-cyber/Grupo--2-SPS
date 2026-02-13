import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

import { SubjectsService } from '../../../services/subjects.service';
import { AddSubjectModal } from '../../../shared/add-subject-modal/add-subject-modal';
import { EditSubjectModal } from './edit-subject-modal/edit-subject-modal';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, AddSubjectModal, EditSubjectModal],
  templateUrl: './subjects.html',
  styleUrls: ['./subjects.css'],
})
export class Subjects implements OnInit {

  subjects: any[] = [];
  uid: string | null = null;
  loading = false;

  showModal = false;
  selectedSubject: any = null;

  constructor(
    private subjectsService: SubjectsService,
    private router: Router,
    private auth: Auth
  ) {}

  async toggleRefresh(ev?: Event) {
  ev?.preventDefault();
  ev?.stopPropagation();

  if (!this.uid) return;

  this.loading = true;

  try {
    await this.loadSubjects();
  } finally {
    this.loading = false;
  }
}

  ngOnInit() {
    onAuthStateChanged(this.auth, async user => {
      this.uid = user?.uid ?? null;
      if (this.uid) {
        await this.loadSubjects();
      }
    });
  }

  async loadSubjects() {
    if (!this.uid) return;
    this.subjects = await this.subjectsService.getSubjectsForUser(this.uid);

  }

  openAddModal() {
    this.selectedSubject = null;
    this.showModal = true;
  }

  editSubject(subject: any) {
    this.selectedSubject = subject;
    this.showModal = true;
    
  }

  async deleteSubject(subjectId: string) {
    if (!this.uid) return;

    const confirmDelete = confirm('¿Eliminar materia permanentemente?');
    if (!confirmDelete) return;

    await this.subjectsService.deleteSubjectCompletely(this.uid, subjectId);
    await this.loadSubjects();
  }

  async onModalClose(e: { saved: boolean }) {
    this.showModal = false;
    if (e?.saved) {
      await this.loadSubjects();
    }
  }

  openSubject(subjectId: string) {
    this.router.navigate(['/dashboard/subjects', subjectId, 'content']);
  }

  generateGuide(subjectId: string) {
    this.router.navigate(['/ai/generate'], { queryParams: { subjectId } });
  }
}
