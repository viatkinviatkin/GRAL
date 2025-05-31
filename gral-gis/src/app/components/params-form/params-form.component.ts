import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { ComputationService } from '../../services/computation.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

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

interface MettseriesRecord {
  date: string;
  hour: number;
  velocity: number;
  direction: number;
  sc: number;
}

@Component({
  selector: 'app-params-form',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
  ],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'ru-RU' },
  ],
  templateUrl: './params-form.component.html',
  styleUrls: ['./params-form.component.scss'],
})
export class ParamsFormComponent implements OnInit {
  requiredFiles = [
    'point.dat',
    'GRAL.geb',
    'mettimeseries.dat',
    'Pollutant.txt',

    //'meteopgt.all',
    //'DispNr.txt',
    //'emissions001.dat',
    //'GRAMMin.dat',
    //'in.dat',
    // Max_Proc.txt
  ];
  files: File[] = [];
  error: string | null = null;
  isDragOver = false;
  isModeling = false;
  pointDatForm: FormGroup;
  mettseriesForm: FormGroup;
  sourceGroups = ['Группа 1', 'Группа 2', 'Группа 3']; // Пример групп, замените на реальные
  gralGebForm: FormGroup;
  pollutantForm: FormGroup;
  pollutants = [
    'NOx',
    'PM10',
    'Odour',
    'SO2',
    'PM2.5',
    'NH3',
    'NO2',
    'NMVOC',
    'HC',
    'HF',
    'HCl',
    'H2S',
    'F',
    'CO',
    'BaP',
    'Pb',
    'Cd',
    'Ni',
    'As',
    'Hg',
    'Tl',
    'TCE',
    'Unknown',
    'Bioaerosols',
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dateAdapter: DateAdapter<any>,
    private computationService: ComputationService,
    private snackBar: MatSnackBar
  ) {
    this.dateAdapter.setLocale('ru-RU');
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

    this.mettseriesForm = this.fb.group({
      records: this.fb.array([]),
    });

    this.gralGebForm = this.fb.group({
      cellSizeX: [10, [Validators.required, Validators.min(0)]],
      cellSizeY: [10, [Validators.required, Validators.min(0)]],
      cellSizeZ: [2, [Validators.required, Validators.min(0)]],
      cellSizeZStretch: [1.01, [Validators.required, Validators.min(1)]],
      cellsCountX: [17, [Validators.required, Validators.min(1)]],
      cellsCountY: [10, [Validators.required, Validators.min(1)]],
      horizontalSlices: [1, [Validators.required, Validators.min(1)]],
      sourceGroups: ['1', [Validators.required]],
      westBorder: [480, [Validators.required]],
      eastBorder: [650, [Validators.required]],
      southBorder: [-380, [Validators.required]],
      northBorder: [-280, [Validators.required]],
    });

    this.pollutantForm = this.fb.group({
      pollutant: ['NOx', [Validators.required]],
      wetDepositionCW: [0, [Validators.required]],
      wetDepositionAlphaW: [0, [Validators.required]],
      decayRate: [0, [Validators.required]],
    });
  }

  get records() {
    return this.mettseriesForm.get('records') as FormArray;
  }

  addRecord() {
    const record = this.fb.group({
      date: [''],
      hour: [0],
      velocity: [0],
      direction: [0],
      sc: [0],
    });
    this.records.push(record);
  }

  removeRecord(index: number) {
    this.records.removeAt(index);
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
      this.computationService.savePointDat(this.pointDatForm.value).subscribe({
        next: () => {
          this.snackBar.open('Файл point.dat успешно сохранен', 'OK', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(
            'Ошибка при сохранении point.dat: ' + error.message,
            'OK',
            { duration: 5000 }
          );
        },
      });
    }
  }

  onMettseriesSubmit() {
    if (this.mettseriesForm.valid) {
      const records = this.records.value.map((record: any) => {
        const date = new Date(record.date);
        return {
          date: `${date.getDate().toString().padStart(2, '0')}.${(
            date.getMonth() + 1
          )
            .toString()
            .padStart(2, '0')}`,
          hour: record.hour,
          velocity: record.velocity,
          direction: record.direction,
          sc: record.sc,
        };
      });

      this.computationService.saveMettseries(records).subscribe({
        next: () => {
          this.snackBar.open('Файл mettimeseries.dat успешно сохранен', 'OK', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(
            'Ошибка при сохранении mettimeseries.dat: ' + error.message,
            'OK',
            { duration: 5000 }
          );
        },
      });
    }
  }

  onGralGebSubmit() {
    if (this.gralGebForm.valid) {
      this.computationService.saveGralGeb(this.gralGebForm.value).subscribe({
        next: () => {
          this.snackBar.open('Файл GRAL.geb успешно сохранен', 'OK', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(
            'Ошибка при сохранении GRAL.geb: ' + error.message,
            'OK',
            { duration: 5000 }
          );
        },
      });
    }
  }

  onPollutantSubmit() {
    if (this.pollutantForm.valid) {
      this.computationService
        .savePollutant(this.pollutantForm.value)
        .subscribe({
          next: () => {
            this.snackBar.open('Файл Pollutant.txt успешно сохранен', 'OK', {
              duration: 3000,
            });
          },
          error: (error) => {
            this.snackBar.open(
              'Ошибка при сохранении Pollutant.txt: ' + error.message,
              'OK',
              { duration: 5000 }
            );
          },
        });
    }
  }

  saveAllFiles() {
    if (
      this.pointDatForm.valid &&
      this.mettseriesForm.valid &&
      this.gralGebForm.valid &&
      this.pollutantForm.valid
    ) {
      const records = this.records.value.map((record: any) => {
        const date = new Date(record.date);
        return {
          date: `${date.getDate().toString().padStart(2, '0')}.${(
            date.getMonth() + 1
          )
            .toString()
            .padStart(2, '0')}`,
          hour: record.hour,
          velocity: record.velocity,
          direction: record.direction,
          sc: record.sc,
        };
      });

      const data = {
        pointDat: this.pointDatForm.value,
        mettseries: records,
        gralGeb: this.gralGebForm.value,
        pollutant: this.pollutantForm.value,
      };

      this.computationService.saveAllFiles(data).subscribe({
        next: () => {
          this.snackBar.open('Все файлы успешно сохранены', 'OK', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(
            'Ошибка при сохранении файлов: ' + error.message,
            'OK',
            { duration: 5000 }
          );
        },
      });
    } else {
      this.snackBar.open('Пожалуйста, заполните все формы корректно', 'OK', {
        duration: 5000,
      });
    }
  }
}
