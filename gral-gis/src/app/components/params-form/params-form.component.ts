import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';

interface PointDatModel {
  x: number;
  y: number;
  z: number;
  h2s: number;
  exitVelocity: number;
  diameter: number;
  temperature: number;
  sourceGroup: string;
  f25: number;
  f10: number;
  diaMax: number;
  density: number;
  vDep25: number;
  vDep10: number;
  vDepMax: number;
  depConc: number;
}

@Component({
  selector: 'app-params-form',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    HttpClientModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [HttpClient],
  templateUrl: './params-form.component.html',
  styleUrls: ['./params-form.component.scss'],
})
export class ParamsFormComponent implements OnInit {
  requiredFiles = [
    'in.dat',
    'meteopgt.all',
    'mettimeseries.dat',
    'point.dat',
    'emissions001.dat',
    'GRAMMin.dat',
    'GRAL.geb',
  ];
  files: File[] = [];
  error: string | null = null;
  isDragOver = false;
  isModeling = false;
  pointDatForm: FormGroup;
  sourceGroups = ['Группа 1', 'Группа 2', 'Группа 3']; // Пример групп, замените на реальные

  constructor(private http: HttpClient, private fb: FormBuilder) {
    this.pointDatForm = this.fb.group({
      x: [0],
      y: [0],
      z: [0],
      h2s: [0],
      exitVelocity: [0],
      diameter: [0],
      temperature: [0],
      sourceGroup: [''],
      f25: [0],
      f10: [0],
      diaMax: [0],
      density: [0],
      vDep25: [0],
      vDep10: [0],
      vDepMax: [0],
      depConc: [0],
    });
  }

  ngOnInit() {}

  get acceptString(): string {
    return this.requiredFiles.map((f) => '.' + f.split('.').pop()).join(',');
  }

  onFileChange(event: any) {
    this.files = Array.from(event.target.files);
    this.validateFiles();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer) {
      this.files = Array.from(event.dataTransfer.files);
      this.validateFiles();
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  validateFiles() {
    return;
    const fileNames = this.files.map((f) => f.name);
    const missing = this.requiredFiles.filter(
      (req) => !fileNames.includes(req)
    );
    if (missing.length > 0) {
      this.error = 'Не хватает файлов: ' + missing.join(', ');
    } else {
      this.error = null;
    }
  }

  onSendFiles() {
    this.validateFiles();
    if (this.error) return;

    const formData = new FormData();
    this.files.forEach((file) => formData.append('files', file, file.name));
    this.http
      .post('https://localhost:44373/api/computation/upload', formData)
      .subscribe({
        next: () => alert('Файлы успешно загружены!'),
        error: () => alert('Ошибка загрузки файлов!'),
      });
  }

  clearFiles() {
    this.files = [];
    this.error = null;
  }

  onModeling() {
    if (!this.isModeling) {
      // Запуск моделирования
      const inputFile = this.files.find(
        (f) => f.name.toLowerCase() === 'in.dat'
      );
      if (!inputFile) {
        alert('Не найден обязательный файл in.dat!');
        return;
      }
      this.isModeling = true;
      this.http
        .post('https://localhost:44373/api/gral/run', {
          InputFile: './computation',
        })
        .subscribe({
          next: () => {},
          error: () => {
            this.isModeling = false;
            alert('Ошибка запуска моделирования!');
          },
        });
    } else {
      // Остановка моделирования
      this.http.post('https://localhost:44373/api/gral/stop', {}).subscribe({
        next: () => {
          this.isModeling = false;
        },
        error: () => {
          alert('Ошибка остановки моделирования!');
        },
      });
    }
  }

  onPointDatSubmit() {
    if (this.pointDatForm.valid) {
      console.log('Point.dat form submitted:', this.pointDatForm.value);
      // Здесь будет логика отправки данных на сервер
    }
  }
}
