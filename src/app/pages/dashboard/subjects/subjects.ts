import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { SubjectsService } from '../../../services/subjects.service';
import { EventsService } from '../../../services/events/events.service';
import { EVENTS } from '../../../services/events/events.constants';

import { SubjectCardComponent } from '../../../shared/subject-card/subject-card.component';
import { AddSubjectModal } from '../../../shared/add-subject-modal/add-subject-modal';


@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, SubjectCardComponent, AddSubjectModal],
  templateUrl: './subjects.html',
  styleUrls: ['./subjects.css'],
})
export class Subjects implements OnInit {
  subjects: any[] = [];
  uid = 'demo-user';
  showAddModal = false;

  constructor(
    private subjectsService: SubjectsService,
    private router: Router,
    private events: EventsService
  ) {}

 async ngOnInit() {
  this.subjects = await this.subjectsService.getSubjectsForUser(this.uid);
  console.log('SUBJECTS =>', this.subjects);
}


  openAddModal() {
    this.showAddModal = true;
  }

  async onModalClose(added: boolean) {
    this.showAddModal = false;

    if (added) {
      this.subjects = await this.subjectsService.getSubjectsForUser(this.uid);

      this.events.track(EVENTS.SUBJECT_ADDED, {
        uid: this.uid,
      });
    }
  }

  async removeSubject(subjectId: string) {
    await this.subjectsService.removeSubjectFromUser(this.uid, subjectId);
    this.subjects = this.subjects.filter(s => s.id !== subjectId);

    this.events.track(EVENTS.SUBJECT_REMOVED, {
      subjectId,
      uid: this.uid,
    });
  }

  openSubject(subjectId: string) {
    this.events.track(EVENTS.SUBJECT_OPENED, {
      subjectId,
      uid: this.uid,
    });

    this.router.navigate(['/dashboard/subjects', subjectId, 'content']);
  }

  generateGuide(subjectId: string) {
    this.router.navigate(['/ai/generate'], {
      queryParams: { subjectId },
    });
  }
}
