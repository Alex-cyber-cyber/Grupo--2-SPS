import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { SubjectsService } from '../../services/subjects.service';

@Component({
  selector: 'app-add-subject-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-subject-modal.html',
  styleUrls: ['./add-subject-modal.css'],
})
export class AddSubjectModal implements OnInit {
  @Input({ required: true }) uid!: string;
  @Input() editData: any = null;
  @Output() close = new EventEmitter<{ saved: boolean; subject?: any }>();

  saving = false;
  errorMsg = '';
  isEditMode = false;

  readonly colors = ['#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#F59E0B', '#0EA5E9', '#111827'];
  readonly icons = [
    '\uD83D\uDCDA',
    '\uD83E\uDDE0',
    '\uD83D\uDCBB',
    '\uD83E\uDDEA',
    '\uD83D\uDCCA',
    '\uD83E\uDDEE',
    '\uD83D\uDCDD',
    '\uD83D\uDD2C',
    '\u26A1',
    '\uD83C\uDFA8',
  ];

  careerOptions: string[] = [
    'Ingenieria en: Electronica',
    'Ingenieria en: Gestion de Ambiente y Desarrollo',
    'Ingenieria en: Gestion Logistica',
    'Ingenieria en: Informatica',
    'Licenciatura en: Administracion de Empresas',
    'Licenciatura en: Contaduria Publica y Finanzas',
    'Licenciatura en: Derecho',
    'Licenciatura en: Diseno Grafico',
    'Licenciatura en: Economia',
    'Licenciatura en: Enfermeria',
    'Licenciatura en: Mercadotecnia',
    'Licenciatura en: Periodismo',
    'Licenciatura en: Psicologia',
    'Licenciatura en: Recursos Humanos',
    'Licenciatura en: Terapia Fisica y Ocupacional',
    'Tecnico Universitario: Bilingue en Call Center',
    'Tecnico Universitario en: Administracion',
    'Tecnico Universitario en: Bilingue en Turismo',
    'Tecnico Universitario en: Comercializacion y Promocion Retail',
    'Tecnico Universitario en: Desarrollo de Aplicaciones Web',
    'Tecnico Universitario en: Desarrollo y Cuidado Infantil',
    'Tecnico Universitario en: Diseno de Interiores',
    'Otra',
  ];

  universityOptions: string[] = 
  [ 'El Prado - Tegucigalpa', 
    'Centroamérica - Tegucigalpa', 
    'Norte - San Pedro Sula', 
    'Central - San Pedro Sula', 
    'La Ceiba' ];

  timeOptions: { value: string; label: string }[] = [];
  form: FormGroup;

  constructor(
    private subjectsService: SubjectsService,
    private fb: FormBuilder,
  ) {
    this.timeOptions = this.buildTimeOptions();
    this.form = this.createForm();
  }

  ngOnInit(): void {
    if (!this.editData) return;

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
      icon: ['\uD83D\uDCDA', [Validators.required]],
      schedule: this.fb.array([]),
    });
  }

  closeModal(): void {
    if (this.saving) return;
    this.close.emit({ saved: false });
  }

  pickColor(c: string): void {
    this.form.patchValue({ color: c });
  }

  pickIcon(i: string): void {
    this.form.patchValue({ icon: i });
  }

  addScheduleRow(): void {
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

  removeScheduleRow(index: number): void {
    this.scheduleArray.removeAt(index);
  }

  async saveSubject(): Promise<void> {
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.saving = true;

      const v: any = this.form.value;
      const careerFinal = v.career === 'Otra' ? (v.careerOther || '').trim() : (v.career || '').trim();

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
      };

      if (this.isEditMode) {
        await this.subjectsService.updateSubject(this.editData.id, cleanedData);
        this.close.emit({
          saved: true,
          subject: {
            ...(this.editData || {}),
            ...cleanedData,
            id: this.editData.id,
          },
        });
      } else {
        const newId = await this.subjectsService.createSubjectForUser(this.uid, cleanedData);
        this.close.emit({
          saved: true,
          subject: {
            ...cleanedData,
            id: newId,
          },
        });
      }
    } catch (err: any) {
      this.errorMsg = err?.message ?? 'Ocurrio un error guardando la materia.';
    } finally {
      this.saving = false;
    }
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
