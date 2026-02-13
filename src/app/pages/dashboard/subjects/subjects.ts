import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, Unsubscribe, onAuthStateChanged } from '@angular/fire/auth';
import { SubjectsService } from '../../../services/subjects.service';
import { AddSubjectModal } from '../../../shared/add-subject-modal/add-subject-modal';
import { EditSubjectModal } from '../../../edit-subject-modal/edit-subject-modal';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, AddSubjectModal, EditSubjectModal],
  templateUrl: './subjects.html',
  styleUrls: ['./subjects.css'],
})
export class Subjects implements OnInit, OnDestroy {
  subjects: any[] = [];
  showAddModal = false;
  uid: string | null = null;
  loading = false;
  private refreshSeq = 0;
  private unsubAuth: Unsubscribe | null = null;

 
  editingSubject: any | null = null;

  constructor(
    private subjectsService: SubjectsService,
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.unsubAuth = onAuthStateChanged(this.auth, async (user) => {
      this.uid = user?.uid ?? null;
      if (!this.uid) {
        this.subjects = [];
        this.stopRefresh();
        return;
      }
      await this.refresh(true);
    });
  }

  ngOnDestroy() {
    if (this.unsubAuth) this.unsubAuth();
  }

  openAddModal() {
    if (!this.uid) return;
    this.showAddModal = true;
  }

  async onAddModalClose(e: { saved: boolean }) {
    this.showAddModal = false;
    if (e?.saved) await this.refresh(true);
  }

  openEditModal(subject: any) {
    this.editingSubject = subject;
  }

  async onEditModalClose(e: { saved: boolean }) {
    this.editingSubject = null;
    if (e?.saved) await this.refresh(true);
  }

  toggleRefresh(ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (this.loading) {
      this.stopRefresh();
      return;
    }
    this.refresh(true);
  }

  stopRefresh() {
    this.refreshSeq++;
    this.loading = false;
  }

  private withTimeout<T>(p: Promise<T>, ms: number) {
    return new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      p.then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (err) => {
          clearTimeout(t);
          reject(err);
        }
      );
    });
  }

  async refresh(forceServer = false) {
    if (!this.uid) return;
    const seq = ++this.refreshSeq;
    this.loading = true;

    try {
      const fast = await this.subjectsService.getSubjectsForUser(this.uid, false);
      if (seq === this.refreshSeq) this.subjects = fast.filter((s) => !s._archived);
    } catch {}

    const serverPromise = this.subjectsService
      .getSubjectsForUser(this.uid, true)
      .then((list) => {
        if (seq === this.refreshSeq) this.subjects = list.filter((s) => !s._archived);
      })
      .catch(() => {});

    try {
      await this.withTimeout(serverPromise.then(() => true), forceServer ? 1200 : 800);
    } catch {} finally {
      if (seq === this.refreshSeq) this.loading = false;
    }
  }

  async archiveSubject(subjectId: string) {
    if (!this.uid) return;
    const ok = confirm('⚠️ Esto eliminará la materia y TODO su contenido para TODOS. ¿Seguro?');
    if (!ok) return;

    const before = [...this.subjects];
    this.subjects = this.subjects.filter((s) => s.id !== subjectId);

    try {
      await this.subjectsService.deleteSubjectEverywhere(subjectId);
    } catch (e) {
      console.error(e);
      this.subjects = before;
      alert('No se pudo eliminar la materia 😓');
    }
  }

  openSubject(subjectId: string) {
    this.router.navigate(['/dashboard/subjects', subjectId, 'content']);
  }

  generateGuide(subjectId: string) {
    this.router.navigate(['/ai/generate'], { queryParams: { subjectId } });
  }
}
