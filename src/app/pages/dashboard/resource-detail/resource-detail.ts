import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ResourceEventsService } from '../../../services/resource.service';

@Component({
  selector: 'app-resource-detail',
  standalone: true,
  templateUrl: './resource-detail.html',
  styleUrls: ['./resource-detail.css'],
  imports: [CommonModule]
})
export class ResourceDetail implements OnInit {
  recurso: any;

  recursosMock = [
    {
      id: '1',
      titulo: 'Guía Álgebra',
      tipo: 'guia',
      resultJson: {
        secciones: [
          { titulo: 'Ecuaciones', preguntas: ['¿Qué es una ecuación?', 'Resuelve x + 3 = 7'] }
        ]
      }
    },
    {
      id: '2',
      titulo: 'Examen Revolución',
      tipo: 'examen',
      resultJson: {
        secciones: [
          { titulo: 'Independencia', preguntas: ['¿Cuándo inició?', '¿Quiénes participaron?'] }
        ]
      }
    },
    {
      id: '3',
      titulo: 'Guía Física',
      tipo: 'guia',
      resultJson: {
        secciones: [
          { titulo: 'Leyes de Newton', preguntas: ['Describe la primera ley.', 'Da un ejemplo práctico.'] }
        ]
      }
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private resourceEvents: ResourceEventsService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.recurso = this.recursosMock.find(r => r.id === id);

    if (this.recurso) {
      this.resourceEvents.resourceViewed(this.recurso.id); // Evento resource_opened
    }
  }

  eliminar() {
    if (!this.recurso) return;
    this.resourceEvents.resourceRemoved(this.recurso.id); // Evento resource_deleted
    this.router.navigate(['/resources']);
  }

  exportar() {
    // Aquí podrías implementar la lógica de exportar
    alert('Exportar recurso: ' + this.recurso.titulo);
  }
}
