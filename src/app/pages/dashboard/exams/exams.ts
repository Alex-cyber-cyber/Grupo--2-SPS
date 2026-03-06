import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ExamsService, ExamDoc, ExamResults } from '../../../services/exams.service';
import { ExamQuestion } from '../../../services/open-router.service';

type ExamView = 'list' | 'detail' | 'taking' | 'history-review';

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './exams.html',
  styleUrl: './exams.css',
})
export class Exams implements OnInit {
  readonly Math = Math;

  exams: ExamDoc[] = [];
  loading = true;
  error = '';

  view: ExamView = 'list';
  selectedExam: ExamDoc | null = null;
  deleteConfirmId: string | null = null;

  currentQuestionIndex = 0;
  userAnswers: Record<string, string | number> = {};
  showResult = false;
  examFinished = false;
  score = 0;
  totalPoints = 0;

  // History review
  reviewQuestionIndex = 0;

  constructor(
    private examsService: ExamsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadExams();
  }

  async loadExams(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado')), 15000),
    );

    try {
      this.exams = await Promise.race([this.examsService.getMyExams(), timeout]);
    } catch (e: any) {
      console.error('Error cargando exámenes:', e);
      this.error = e.message || 'Error al cargar exámenes';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openDetail(exam: ExamDoc): void {
    this.selectedExam = exam;
    this.view = 'detail';
    this.cdr.detectChanges();
  }

  backToList(): void {
    this.view = 'list';
    this.selectedExam = null;
    this.resetExamState();
    this.cdr.detectChanges();
  }

  startExam(): void {
    if (!this.selectedExam) return;
    this.resetExamState();
    this.view = 'taking';
    this.cdr.detectChanges();
  }

  private resetExamState(): void {
    this.currentQuestionIndex = 0;
    this.userAnswers = {};
    this.showResult = false;
    this.examFinished = false;
    this.score = 0;
    this.totalPoints = 0;
  }

  get currentQuestion(): ExamQuestion | null {
    if (!this.selectedExam) return null;
    return this.selectedExam.exam.questions[this.currentQuestionIndex] ?? null;
  }

  get totalQuestions(): number {
    return this.selectedExam?.exam.questions.length ?? 0;
  }

  get hasAnswered(): boolean {
    if (!this.currentQuestion) return false;
    return this.userAnswers[this.currentQuestion.id] !== undefined;
  }

  selectChoice(index: number): void {
    if (!this.currentQuestion || this.showResult) return;
    this.userAnswers[this.currentQuestion.id] = index;
    this.cdr.detectChanges();
  }

  selectTrueFalse(answer: string): void {
    if (!this.currentQuestion || this.showResult) return;
    this.userAnswers[this.currentQuestion.id] = answer;
    this.cdr.detectChanges();
  }

  checkAnswer(): void {
    this.showResult = true;
    this.cdr.detectChanges();
  }

  isCorrect(): boolean {
    if (!this.currentQuestion) return false;
    const userAnswer = this.userAnswers[this.currentQuestion.id];

    if (this.currentQuestion.type === 'multiple_choice') {
      return userAnswer === this.currentQuestion.correctChoiceIndex;
    }

    if (this.currentQuestion.type === 'true_false') {
      return userAnswer === this.currentQuestion.correctAnswer;
    }

    return false;
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      this.currentQuestionIndex++;
      this.showResult = false;
      this.cdr.detectChanges();
    } else {
      this.finishExam();
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.showResult = this.userAnswers[this.currentQuestion?.id ?? ''] !== undefined;
      this.cdr.detectChanges();
    }
  }

  async finishExam(): Promise<void> {
    if (!this.selectedExam) return;

    let score = 0;
    let totalPoints = 0;
    const answers: Record<string, { selected: string | number; correct: boolean }> = {};

    for (const q of this.selectedExam.exam.questions) {
      totalPoints += q.points;
      const userAnswer = this.userAnswers[q.id];
      let correct = false;

      if (q.type === 'multiple_choice') {
        correct = userAnswer === q.correctChoiceIndex;
      } else if (q.type === 'true_false') {
        correct = userAnswer === q.correctAnswer;
      }

      if (correct) score += q.points;
      answers[q.id] = { selected: userAnswer, correct };
    }

    this.score = score;
    this.totalPoints = totalPoints;
    this.examFinished = true;

    const results: ExamResults = {
      completed: true,
      score,
      totalPoints,
      answers,
      completedAt: new Date(),
    };

    try {
      await this.examsService.saveResults(this.selectedExam.id, results);
      this.selectedExam.results = results;
    } catch (e) {
      console.error('Error guardando resultados:', e);
    }

    this.cdr.detectChanges();
  }

  confirmDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  async doDelete(): Promise<void> {
    if (!this.deleteConfirmId) return;
    try {
      await this.examsService.deleteExam(this.deleteConfirmId);
      this.exams = this.exams.filter((e) => e.id !== this.deleteConfirmId);
      this.deleteConfirmId = null;
      if (this.selectedExam?.id === this.deleteConfirmId) {
        this.backToList();
      }
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    }
    this.cdr.detectChanges();
  }

  formatDate(d: Date): string {
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getDifficultyLabel(d: string): string {
    const map: Record<string, string> = {
      basico: 'Básico',
      intermedio: 'Intermedio',
      avanzado: 'Avanzado',
    };
    return map[d] || d;
  }

  getScorePercent(): number {
    if (this.totalPoints === 0) return 0;
    return Math.round((this.score / this.totalPoints) * 100);
  }

  hasResults(exam: ExamDoc): boolean {
    return !!exam.results?.completed;
  }

  // --- History ---

  get completedExams(): ExamDoc[] {
    return this.exams
      .filter((e) => e.results?.completed)
      .sort((a, b) => {
        const dateA = a.results?.completedAt ? new Date(a.results.completedAt).getTime() : 0;
        const dateB = b.results?.completedAt ? new Date(b.results.completedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }

  openHistoryReview(exam: ExamDoc): void {
    this.selectedExam = exam;
    this.reviewQuestionIndex = 0;
    this.view = 'history-review';
    this.cdr.detectChanges();
  }

  get reviewQuestion(): ExamQuestion | null {
    if (!this.selectedExam) return null;
    return this.selectedExam.exam.questions[this.reviewQuestionIndex] ?? null;
  }

  get reviewTotalQuestions(): number {
    return this.selectedExam?.exam.questions.length ?? 0;
  }

  reviewNext(): void {
    if (this.reviewQuestionIndex < this.reviewTotalQuestions - 1) {
      this.reviewQuestionIndex++;
      this.cdr.detectChanges();
    }
  }

  reviewPrev(): void {
    if (this.reviewQuestionIndex > 0) {
      this.reviewQuestionIndex--;
      this.cdr.detectChanges();
    }
  }

  getReviewAnswer(questionId: string): { selected: string | number; correct: boolean } | null {
    return this.selectedExam?.results?.answers?.[questionId] ?? null;
  }

  getHistoryScorePercent(exam: ExamDoc): number {
    if (!exam.results || exam.results.totalPoints === 0) return 0;
    return Math.round((exam.results.score / exam.results.totalPoints) * 100);
  }
}
