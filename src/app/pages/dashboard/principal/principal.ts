import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { NavigationEnd, Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { filter } from 'rxjs/operators';

import { SubjectsService } from '../../../services/subjects.service';
import { EventsService } from '../../../services/events/events.service';
import { ExamDoc, ExamsService } from '../../../services/exams.service';

Chart.register(...registerables);

@Component({
  selector: 'app-principal',
  standalone: true,
  templateUrl: './principal.html',
  styleUrls: ['./principal.css'],
})
export class Principal implements AfterViewInit, OnDestroy {
  @ViewChild('materiasCanvas') materiasCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tiempoCanvas') tiempoCanvas!: ElementRef<HTMLCanvasElement>;

  currentStreak = 0;
  bestStreak = 0;
  weeklyTotalHours = 0;
  weeklyTotalMinutes = 0;
  todayStudyMinutes = 0;

  private isBrowser = false;
  private materiasChart?: Chart;
  private tiempoChart?: Chart;
  private authUnsubscribe?: () => void;
  private navSub?: { unsubscribe: () => void };

  private readonly auth = inject(Auth);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subjectsService = inject(SubjectsService);
  private readonly eventsService = inject(EventsService);
  private readonly examsService = inject(ExamsService);
  private readonly router = inject(Router);

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    const currentUid = this.auth.currentUser?.uid;
    if (currentUid) void this.loadDashboardData(currentUid);

    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      this.zone.run(() => {
        if (!user) {
          this.currentStreak = 0;
          this.bestStreak = 0;
          this.weeklyTotalHours = 0;
          this.weeklyTotalMinutes = 0;
          this.todayStudyMinutes = 0;
          this.crearGraficos([], []);
          this.cdr.detectChanges();
          return;
        }

        void this.loadDashboardData(user.uid);
      });
    });

    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url === '/dashboard') {
          const uid = this.auth.currentUser?.uid;
          if (uid) void this.loadDashboardData(uid);
        }
      });
  }

  private async loadDashboardData(uid: string): Promise<void> {
    const [subjects, metrics, exams] = await Promise.all([
      this.subjectsService.getSubjectsForUser(uid).catch(() => []),
      this.eventsService.getDashboardMetrics().catch(() => ({
        weeklyStudyHours: [0, 0, 0, 0, 0, 0, 0],
        weeklyStudyMinutes: [0, 0, 0, 0, 0, 0, 0],
        topSubjects: [],
        currentStreak: 0,
        bestStreak: 0,
      })),
      this.examsService.getMyExams().catch(() => []),
    ]);
    const metricsWeeklyMinutes = metrics.weeklyStudyMinutes.map((minutes) => Number(minutes) || 0);

    const nameById = new Map<string, string>();
    for (const subject of subjects) {
      const id = String(subject?.id ?? '');
      if (!id) continue;
      const name = String(subject?.name ?? 'Materia').trim() || 'Materia';
      nameById.set(id, name);
    }

    const examDriven = this.buildExamDrivenMetrics(exams, nameById);
    const mergedWeeklyMinutes = metricsWeeklyMinutes.map(
      (minutes, idx) => minutes + (examDriven.weeklyMinutes[idx] ?? 0),
    );
    const mergedWeeklyHours = mergedWeeklyMinutes.map((minutes) => Math.round((minutes / 60) * 10) / 10);

    const topLabels = examDriven.topSubjects.map((item) => item.label);
    const topValues = examDriven.topSubjects.map((item) => item.consultations);

    this.currentStreak = metrics.currentStreak;
    this.bestStreak = metrics.bestStreak;
    this.weeklyTotalHours = Math.round(mergedWeeklyHours.reduce((acc, n) => acc + n, 0) * 10) / 10;
    this.weeklyTotalMinutes = mergedWeeklyMinutes.reduce((acc, n) => acc + n, 0);
    this.todayStudyMinutes = mergedWeeklyMinutes[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ?? 0;

    this.crearGraficos(topLabels, topValues, mergedWeeklyHours);
    this.cdr.detectChanges();
  }

  private buildExamDrivenMetrics(
    exams: ExamDoc[],
    nameById: Map<string, string>,
  ): {
    topSubjects: Array<{ label: string; consultations: number }>;
    weeklyMinutes: number[];
  } {
    const countByLabel = new Map<string, number>();
    const weeklyMinutes = [0, 0, 0, 0, 0, 0, 0];

    const now = new Date();
    const monday = this.getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    for (const exam of exams) {
      if (!exam.results?.completed) continue;

      const subjectId = String(exam.subjectId ?? '').trim();
      const topicLabel = String(exam.topic ?? '').trim();
      const label = subjectId
        ? ((nameById.get(subjectId) ?? topicLabel) || 'Materia')
        : (topicLabel || 'Sin materia');

      const current = countByLabel.get(label) ?? 0;
      const attemptsFromField = Number(exam.completedAttempts) || 0;
      const attemptsFromHistory = Array.isArray(exam.completedHistory) ? exam.completedHistory.length : 0;
      const attempts = Math.max(attemptsFromField, attemptsFromHistory, 1);
      countByLabel.set(label, current + attempts);

      const duration = Number(exam.exam?.durationMinutes) || 15;
      if (duration <= 0) continue;

      if (attemptsFromHistory > 0) {
        const durations = Array.isArray(exam.completedDurations) ? exam.completedDurations : [];
        for (let i = 0; i < (exam.completedHistory ?? []).length; i++) {
          const attemptDate = exam.completedHistory?.[i];
          if (!attemptDate || attemptDate < monday || attemptDate > sunday) continue;
          const idx = attemptDate.getDay() === 0 ? 6 : attemptDate.getDay() - 1;
          const durationForAttempt = Number(durations[i]) || duration;
          weeklyMinutes[idx] += durationForAttempt;
        }
        continue;
      }

      const completedAt = this.toDate(exam.results?.completedAt) ?? exam.updatedAt ?? exam.createdAt;
      if (!completedAt || completedAt < monday || completedAt > sunday) continue;
      const idx = completedAt.getDay() === 0 ? 6 : completedAt.getDay() - 1;
      weeklyMinutes[idx] += duration * attempts;
    }

    const topSubjects = [...countByLabel.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, consultations]) => ({ label, consultations }));

    return { topSubjects, weeklyMinutes };
  }

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    const maybeTs = value as { toDate?: () => Date };
    if (typeof maybeTs.toDate === 'function') {
      const d = maybeTs.toDate();
      return d instanceof Date ? d : null;
    }
    return null;
  }

  private getMonday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  formatDuration(minutes: number): string {
    const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours <= 0) return `${remainingMinutes} minutos`;
    if (remainingMinutes <= 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;

    return `${hours} ${hours === 1 ? 'hora' : 'horas'} ${remainingMinutes} minutos`;
  }

  private crearGraficos(materiaLabels: string[], materiaValues: number[], weeklyHours?: number[]): void {
    this.materiasChart?.destroy();
    this.tiempoChart?.destroy();

    const safeMateriaLabels = materiaLabels.length ? materiaLabels : ['Sin datos'];
    const safeMateriaValues = materiaValues.length ? materiaValues : [0];
    const safeWeeklyHours = weeklyHours?.length ? weeklyHours : [0, 0, 0, 0, 0, 0, 0];

    this.materiasChart = new Chart(this.materiasCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: safeMateriaLabels,
        datasets: [
          {
            label: 'Examenes realizados',
            data: safeMateriaValues,
            backgroundColor: '#E4002B',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    this.tiempoChart = new Chart(this.tiempoCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'],
        datasets: [
          {
            label: 'Horas de estudio',
            data: safeWeeklyHours,
            borderColor: '#8B0D21',
            backgroundColor: 'rgba(139,13,33,0.2)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.navSub?.unsubscribe();
    this.materiasChart?.destroy();
    this.tiempoChart?.destroy();
  }
}
