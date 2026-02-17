import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-resources',
  standalone: true,
  templateUrl: './resources.html',
  styleUrls: ['./resources.css'],
  imports: [
    CommonModule, 
    FormsModule,   
    RouterModule   
  ]
})
export class Resources {
  recursos = [
    { id: '1', titulo: 'Guía Álgebra', materia: 'Matemáticas', tipo: 'guia', fecha: '2026-02-08' },
    { id: '2', titulo: 'Examen Revolución', materia: 'Historia', tipo: 'examen', fecha: '2026-02-06' },
    { id: '3', titulo: 'Guía Física', materia: 'Física', tipo: 'guia', fecha: '2026-02-05' }
  ];

  filtroMateria = '';
  filtroTipo = '';

  // 🔹 Filtrado de recursos
  get recursosFiltrados() {
    return this.recursos.filter(r =>
      (this.filtroMateria ? r.materia === this.filtroMateria : true) &&
      (this.filtroTipo ? r.tipo === this.filtroTipo : true)
    );
  }
}
