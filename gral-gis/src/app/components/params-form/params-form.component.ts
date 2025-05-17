import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-params-form',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, HttpClientModule],
  providers: [HttpClient],
  templateUrl: './params-form.component.html',
  styleUrls: ['./params-form.component.scss'],
})
export class ParamsFormComponent {
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

  constructor(private http: HttpClient) {}

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
    this.http.post('/api/computation/upload', formData).subscribe({
      next: () => alert('Файлы успешно загружены!'),
      error: () => alert('Ошибка загрузки файлов!'),
    });
  }

  clearFiles() {
    this.files = [];
    this.error = null;
  }
}
