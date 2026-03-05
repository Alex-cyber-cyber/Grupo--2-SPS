import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SubjectsService } from '../../../services/subjects.service';
import { AddSubjectModal } from '../../../shared/add-subject-modal/add-subject-modal';
import { EditSubjectModal } from './edit-subject-modal/edit-subject-modal';
import { SubjectInfoModal } from './subject-info-modal/subject-info-modal';
import { EventsService } from '../../../services/events/events.service';

type SubjectModalCloseEvent = {
  saved: boolean;
  subject?: any;
};

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
  private static subjectsCache = new Map<string, any[]>();

  subjects: any[] = [];
  uid: string | null = null;
  loading = false;
  private postSaveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  showModal = false;
  selectedSubject: any = null;

  editDataForAddModal: any = null;

  infoSubject: any = null;

  constructor(
    private subjectsService: SubjectsService,
    private eventsService: EventsService,
    private router: Router,
    private auth: Auth,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const current = this.auth.currentUser;
    if (current?.uid) {
      this.uid = current.uid;
      const cached = Subjects.subjectsCache.get(this.uid);
      if (cached) {
        this.subjects = [...cached];
        this.cdr.detectChanges();
      }
      void this.loadSubjects();
    }

    onAuthStateChanged(this.auth, (user) => {
      this.zone.run(async () => {
        this.uid = user?.uid ?? null;
        if (!this.uid) return;

        const cached = Subjects.subjectsCache.get(this.uid);
        if (cached) {
          this.subjects = [...cached];
          this.cdr.detectChanges();
        }

        await this.loadSubjects();
        this.cdr.detectChanges();
      });
    });
  }

  async loadSubjects(forceServer = false): Promise<void> {
    if (!this.uid) return;
    const data = await this.subjectsService.getSubjectsForUser(this.uid, forceServer);
    this.zone.run(() => {
      this.subjects = data.map((s) => ({ ...s, icon: this.normalizeIcon(s.icon) }));
      Subjects.subjectsCache.set(this.uid!, [...this.subjects]);
      this.cdr.detectChanges();
    });
  }

  async toggleRefresh(ev?: Event): Promise<void> {
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

  openAddModal(): void {
    this.selectedSubject = null;
    this.editDataForAddModal = null;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  editSubject(subject: any): void {
    this.selectedSubject = subject;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  async deleteSubject(subjectId: string): Promise<void> {
    if (!this.uid || !subjectId) return;

    const confirmDelete = confirm('Eliminar materia permanentemente?');
    if (!confirmDelete) return;

    const previous = [...this.subjects];
    this.subjects = this.subjects.filter((s) => s.id !== subjectId);
    Subjects.subjectsCache.set(this.uid, [...this.subjects]);
    this.cdr.detectChanges();

    try {
      await this.subjectsService.deleteSubjectCompletely(this.uid, subjectId);
      this.schedulePostSaveRefresh();
    } catch (error) {
      console.error(error);
      this.subjects = previous;
      Subjects.subjectsCache.set(this.uid, [...this.subjects]);
      this.cdr.detectChanges();
      alert('No se pudo eliminar la materia. Intentalo de nuevo.');
    }
  }

  onModalClose(e: SubjectModalCloseEvent): void {
    this.showModal = false;
    this.selectedSubject = null;
    this.editDataForAddModal = null;
    this.cdr.detectChanges();

    if (!e?.saved) return;

    if (e.subject?.id) {
      this.upsertLocalSubject(e.subject);
    }

    this.schedulePostSaveRefresh();
  }

  private upsertLocalSubject(subject: any): void {
    const normalized = { ...subject, icon: this.normalizeIcon(subject.icon) };
    const idx = this.subjects.findIndex((s) => s.id === subject.id);

    if (idx >= 0) {
      this.subjects[idx] = { ...this.subjects[idx], ...normalized };
      this.subjects = [...this.subjects];
      if (this.uid) Subjects.subjectsCache.set(this.uid, [...this.subjects]);
      this.cdr.detectChanges();
      return;
    }

    this.subjects = [normalized, ...this.subjects];
    if (this.uid) Subjects.subjectsCache.set(this.uid, [...this.subjects]);
    this.cdr.detectChanges();
  }

  displayIcon(icon: string | null | undefined): string {
    return this.normalizeIcon(icon);
  }

  private normalizeIcon(icon: string | null | undefined): string {
    if (!icon || icon === '?' || icon === '??') return '\uD83D\uDCDA';
    return icon;
  }

  private schedulePostSaveRefresh(): void {
    if (this.postSaveRefreshTimer) clearTimeout(this.postSaveRefreshTimer);

    this.postSaveRefreshTimer = setTimeout(() => {
      void this.loadSubjects(true);
      this.postSaveRefreshTimer = null;
    }, 150);
  }

  async openSubject(subjectId: string): Promise<void> {
    await this.eventsService.trackSubjectOpened(subjectId);
    this.router.navigate(['/dashboard/subjects', subjectId, 'content'], {
      queryParams: { _r: Date.now() },
    });
  }

  generateGuide(subjectId: string): void {
    this.router.navigate(['/ai/generate'], { queryParams: { subjectId } });
  }

  openInfo(subject: any, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (subject?.id) void this.eventsService.trackSubjectOpened(subject.id);
    this.infoSubject = subject;
    this.cdr.detectChanges();
  }

  closeInfo(): void {
    this.infoSubject = null;
    this.cdr.detectChanges();
  }

  onEditFromInfo(subject: any): void {
    if (!subject?.id) return;

    this.closeInfo();

    this.editDataForAddModal = subject;
    this.selectedSubject = null;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  async onDeleteFromInfo(subjectId: string): Promise<void> {
    if (!subjectId) return;
    this.closeInfo();
    await this.deleteSubject(subjectId);
  }
}
