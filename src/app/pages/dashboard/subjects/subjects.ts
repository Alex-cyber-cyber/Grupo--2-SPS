import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SubjectsService } from '../../../services/subjects.service';
import { AddSubjectModal } from '../../../shared/add-subject-modal/add-subject-modal';
import { EditSubjectModal } from './edit-subject-modal/edit-subject-modal';
import { SubjectInfoModal } from './subject-info-modal/subject-info-modal';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    AddSubjectModal,
    EditSubjectModal,
    SubjectInfoModal,
  ],
  templateUrl: './subjects.html',
  styleUrls: ['./subjects.css'],
})
export class Subjects implements OnInit {
  subjects: any[] = [];
  uid: string | null = null;
  loading = false;

  showModal = false;
  selectedSubject: any = null;

  editDataForAddModal: any = null;

  infoSubject: any = null;

  constructor(
    private subjectsService: SubjectsService,
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit() {
    onAuthStateChanged(this.auth, async user => {
      this.uid = user?.uid ?? null;
      if (this.uid) await this.loadSubjects();
    });
  }

  async loadSubjects(forceServer = false) {
    if (!this.uid) return;
    this.subjects = await this.subjectsService.getSubjectsForUser(this.uid, forceServer);
  }

  async toggleRefresh(ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (!this.uid || this.loading) return;

    this.loading = true;
    try {
      await this.loadSubjects(true);
    } finally {
      this.loading = false;
    }
  }

  openAddModal() {
    this.selectedSubject = null;
    this.editDataForAddModal = null;
    this.showModal = true;
  }

  editSubject(subject: any) {
    this.selectedSubject = subject;
    this.showModal = true;
  }

  async deleteSubject(subjectId: string) {
    if (!this.uid || !subjectId) return;

    const confirmDelete = confirm('¿Eliminar materia permanentemente?');
    if (!confirmDelete) return;

    await this.subjectsService.deleteSubjectCompletely(this.uid, subjectId);
    await this.loadSubjects(true);
  }

  async onModalClose(e: { saved: boolean }) {
    this.showModal = false;
    this.selectedSubject = null;
    this.editDataForAddModal = null;

    if (e?.saved) await this.loadSubjects(true);
  }

  openSubject(subjectId: string) {
    this.router.navigate(['/dashboard/subjects', subjectId, 'content']);
  }

  generateGuide(subjectId: string) {
    this.router.navigate(['/ai/generate'], { queryParams: { subjectId } });
  }

  openInfo(subject: any, ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.infoSubject = subject;
  }

  closeInfo() {
    this.infoSubject = null;
  }

  onEditFromInfo(subject: any) {
    if (!subject?.id) return;

    this.closeInfo();

    this.editDataForAddModal = subject;
    this.selectedSubject = null;
    this.showModal = true;
  }

  async onDeleteFromInfo(subjectId: string) {
    if (!subjectId) return;
    this.closeInfo();
    await this.deleteSubject(subjectId);
  }
}
