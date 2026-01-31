import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';
import { Chart, registerables } from 'chart.js';

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

  private isBrowser = false;
  private materiasChart?: Chart;
  private tiempoChart?: Chart;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    setTimeout(() => this.crearGraficos());
  }

  // =========================
  // crear gráficos
  // =========================
  private crearGraficos() {
    this.materiasChart?.destroy();
    this.tiempoChart?.destroy();

    this.materiasChart = new Chart(this.materiasCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Matemáticas', 'Física', 'Química', 'Historia', 'Lengua'],
        datasets: [{
          label: 'Consultas',
          data: [15, 10, 8, 12, 7],
          backgroundColor: '#E4002B'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    this.tiempoChart = new Chart(this.tiempoCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        datasets: [{
          label: 'Horas de estudio',
          data: [2, 3, 1, 4, 3, 2, 1],
          borderColor: '#8B0D21',
          backgroundColor: 'rgba(139,13,33,0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  ngOnDestroy(): void {
    this.materiasChart?.destroy();
    this.tiempoChart?.destroy();
  }
}
