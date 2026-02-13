import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { SubjectsService, SubjectScheduleRow, WeekdayKey } from '../../services/subjects.service';

@Component({
  selector: 'app-add-subject-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-subject-modal.html',
  styleUrls: ['./add-subject-modal.css'],
})
export class AddSubjectModal implements OnInit {

  @Input({ required: true }) uid!: string;
  @Input() editData: any = null; // 🔥 NUEVO
  @Output() close = new EventEmitter<{ saved: boolean }>();

  saving = false;
  errorMsg = '';
  isEditMode = false; // 🔥 NUEVO

  readonly colors = ['#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#F59E0B', '#0EA5E9', '#111827'];
  readonly icons = ['📚', '🧠', '💻', '🧪', '📊', '🧮', '📝', '🔬', '⚡', '🎨'];

  careerOptions: string[] = [
    'Ingeniería en: Electrónica',
    'Ingeniería en: Gestión de Ambiente y Desarrollo',
    'Ingeniería en: Gestión Logística',
    'Ingeniería en: Informática',
    'Licenciatura en: Administración de Empresas',
    'Licenciatura en: Contaduría Pública y Finanzas',
    'Licenciatura en: Derecho',
    'Licenciatura en: Diseño Gráfico',
    'Licenciatura en: Economía',
    'Licenciatura en: Enfermería',
    'Licenciatura en: Mercadotecnia',
    'Licenciatura en: Periodismo',
    'Licenciatura en: Psicología',
    'Licenciatura en: Recursos Humanos',
    'Licenciatura en: Terapia Física y Ocupacional',
    'Técnico Universitario: Bilingüe en Call Center',
    'Técnico Universitario en: Administración',
    'Técnico Universitario en: Bilingüe en Turismo',
    'Técnico Universitario en: Comercialización y Promoción Retail',
    'Técnico Universitario en: Desarrollo de Aplicaciones Web',
    'Técnico Universitario en: Desarrollo y Cuidado Infantil',
    'Técnico Universitario en: Diseño de Interiores',
    'Otra',
  ];

  readonly weekdays: { key: WeekdayKey; label: string }[] = [
    { key: 'mon', label: 'Lunes' },
    { key: 'tue', label: 'Martes' },
    { key: 'wed', label: 'Miércoles' },
    { key: 'thu', label: 'Jueves' },
    { key: 'fri', label: 'Viernes' },
    { key: 'sat', label: 'Sábado' },
    { key: 'sun', label: 'Domingo' },
  ];

  timeOptions: { value: string; label: string }[] = [];

  form: FormGroup;

  constructor(private subjectsService: SubjectsService, private fb: FormBuilder) {
    this.timeOptions = this.buildTimeOptions();
    this.form = this.createForm();
  }

  ngOnInit() {
    if (this.editData) {
      this.isEditMode = true;

      this.form.patchValue({
        name: this.editData.name,
        module: this.editData.module,
        professor: this.editData.professor,
        section: this.editData.section,
        university: this.editData.university,
        career: this.editData.career,
        description: this.editData.description,
        color: this.editData.color,
        icon: this.editData.icon,
      });

      if (this.editData.schedule?.length) {
        this.editData.schedule.forEach((row: SubjectScheduleRow) => {
          const group = this.fb.group({
            days: this.fb.group({
              mon: [row.days.includes('mon')],
              tue: [row.days.includes('tue')],
              wed: [row.days.includes('wed')],
              thu: [row.days.includes('thu')],
              fri: [row.days.includes('fri')],
              sat: [row.days.includes('sat')],
              sun: [row.days.includes('sun')],
            }),
            start: [row.start],
            end: [row.end],
            room: [row.room || ''],
          });

          this.scheduleArray.push(group);
        });
      }
    }
  }

  get scheduleArray(): FormArray {
    return this.form.get('schedule') as FormArray;
  }

  private createForm() {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      module: ['Q1', [Validators.required]],
      professor: [''],
      section: [''],
      university: [''],
      career: [''],
      careerOther: [''],
      description: [''],
      color: ['#2563EB', [Validators.required]],
      icon: ['📚', [Validators.required]],
      schedule: this.fb.array([]),
    });
  }

  closeModal() {
    if (this.saving) return;
    this.close.emit({ saved: false });
  }
pickColor(c: string) {
  this.form.patchValue({ color: c });
}

pickIcon(i: string) {
  this.form.patchValue({ icon: i });
}

addScheduleRow() {
  const row = this.fb.group({
    days: this.fb.group({
      mon: [false],
      tue: [false],
      wed: [false],
      thu: [false],
      fri: [false],
      sat: [false],
      sun: [false],
    }),
    start: [''],
    end: [''],
    room: [''],
  });

  this.scheduleArray.push(row);
}

removeScheduleRow(index: number) {
  this.scheduleArray.removeAt(index);
}

async saveSubject() {
  this.errorMsg = '';

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  try {
    this.saving = true;

    const v: any = this.form.value;
    const schedule = this.normalizeSchedule();
    const careerFinal =
      v.career === 'Otra'
        ? (v.careerOther || '').trim()
        : (v.career || '').trim();

    const cleanedData: any = {
      name: (v.name || '').trim(),
      module: v.module,
      professor: (v.professor || '').trim(),
      section: (v.section || '').trim(),
      university: (v.university || '').trim(),
      career: careerFinal,
      description: (v.description || '').trim(),
      color: v.color,
      icon: v.icon,
      schedule: schedule || [],
    };

    if (this.isEditMode) {
      // ✏️ EDITAR
      await this.subjectsService.updateSubject(
        this.editData.id,
        cleanedData
      );
    } else {
      // ➕ CREAR
      await this.subjectsService.createSubjectForUser(
        this.uid,
        cleanedData
      );
    }

    this.close.emit({ saved: true });

  } catch (err: any) {
    this.errorMsg =
      err?.message ?? 'Ocurrió un error guardando la materia.';
  } finally {
    this.saving = false;
  }
}


  private extractSelectedDays(daysValue: Record<WeekdayKey, boolean>): WeekdayKey[] {
    return (Object.keys(daysValue) as WeekdayKey[]).filter(k => !!daysValue[k]);
  }

  private normalizeSchedule(): SubjectScheduleRow[] {
    const mapped = this.scheduleArray.controls.map(ctrl => {
      const v: any = ctrl.value;
      const days = this.extractSelectedDays(v.days || {});
      if (!days.length) return null;

      const start = (v.start || '').trim();
      const end = (v.end || '').trim();
      if (!start || !end) {
        throw new Error('Si seleccionas días en el horario, debes poner hora inicio y fin.');
      }

      const roomRaw = (v.room || '').trim();
      return roomRaw ? { days, start, end, room: roomRaw } : { days, start, end };
    });

    return mapped.filter((x): x is SubjectScheduleRow => x !== null);
  }

  private buildTimeOptions() {
    const options: { value: string; label: string }[] = [];
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const toLabel = (h: number, m: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hh = h % 12 === 0 ? 12 : h % 12;
      return `${hh}:${pad(m)} ${ampm}`;
    };

    for (let h = 6; h <= 22; h++) {
      for (const m of [0, 30]) {
        options.push({ value: `${pad(h)}:${pad(m)}`, label: toLabel(h, m) });
      }
    }

    return options;
  }
}
