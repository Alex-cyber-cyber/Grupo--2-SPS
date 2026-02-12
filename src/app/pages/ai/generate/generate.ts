import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generate.html',
  styleUrls: ['./generate.css']
})
export class Generate implements OnInit {

  subject: any = null;
  loading = true;
  guide: any = null;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore
  ) {}

  async ngOnInit() {
  const subjectId = this.route.snapshot.queryParamMap.get('subjectId');
  console.log('Subject ID recibido:', subjectId);

  if (!subjectId) {
    console.log('No llegó subjectId');
    this.loading = false;
    return;
  }

  const ref = doc(this.firestore, `subjects/${subjectId}`);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    console.log('Materia encontrada');
    this.subject = snap.data();
    this.generateGuide();
  } else {
    console.log('NO se encontró la materia en Firestore');
  }

  this.loading = false;
}


  generateGuide() {
    if (!this.subject) return;

    this.guide = {
      resumen: `La materia ${this.subject.name} pertenece al módulo ${this.subject.module}. 
Se enfoca en ${this.subject.description || 'desarrollar conocimientos fundamentales.'}`,

      objetivos: [
        'Comprender los conceptos principales',
        'Aplicar los conocimientos en ejercicios prácticos',
        'Prepararse para evaluaciones parciales y finales'
      ],

      planSemanal: [
        'Semana 1: Introducción y fundamentos',
        'Semana 2: Desarrollo de conceptos clave',
        'Semana 3: Aplicaciones prácticas',
        'Semana 4: Repaso general y evaluación'
      ]
    };
  }
}
