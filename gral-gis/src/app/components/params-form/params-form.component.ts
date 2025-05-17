import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-params-form',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './params-form.component.html',
  styleUrls: ['./params-form.component.scss'],
})
export class ParamsFormComponent implements OnInit {
  files: string[] = ['params1.json', 'params2.json', 'params3.json']; // заглушка, заменить на API
  selectedFile = new FormControl('');

  constructor() {}

  ngOnInit(): void {
    // Здесь можно сделать запрос к API для получения списка файлов
    // this.http.get<string[]>('/api/computation/files').subscribe(data => this.files = data);
  }

  onModel() {
    // TODO: отправить выбранный файл на backend для моделирования
    alert('Моделирование для файла: ' + this.selectedFile.value);
  }
}
