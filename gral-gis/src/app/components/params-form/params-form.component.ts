import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { MapService } from '../../services/map.service';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil, switchMap, takeWhile } from 'rxjs/operators';

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
  source: number;
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
export class ParamsFormComponent implements OnInit, OnDestroy {
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
  mettseriesForm!: FormGroup;
  sourceGroups = ['1']; // Пример групп, замените на реальные
  gralGebForm: FormGroup;
  pollutantForm!: FormGroup;
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
  isSimulationEnabled = false;
  private destroy$ = new Subject<void>();
  private statusPollingSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dateAdapter: DateAdapter<any>,
    private computationService: ComputationService,
    private snackBar: MatSnackBar,
    private mapService: MapService
  ) {
    this.dateAdapter.setLocale('ru-RU');
    this.pointDatForm = this.fb.group({
      x: [366],
      y: [-277],
      z: [10],
      sourceEmission: [25],
      exitVelocity: [0],
      diameter: [0.2],
      temperature: [273],
      sourceGroup: ['1'],
      f25: [0],
      f10: [0],
      diaMax: [0],
      density: [0],
      vDep25: [0],
      vDep10: [0],
      vDepMax: [0],
      depConc: [0],
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
      westBorder: [320, [Validators.required]],
      eastBorder: [420, [Validators.required]],
      southBorder: [-310, [Validators.required]],
      northBorder: [-250, [Validators.required]],
    });

    this.initPollutantForm();
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

  ngOnInit() {
    this.initForm();
    this.loadMetTimeSeries();

    // Подписываемся на изменения координат маркера
    this.mapService.markerCoordinates$
      .pipe(takeUntil(this.destroy$))
      .subscribe((coordinates) => {
        if (coordinates) {
          this.pointDatForm.patchValue({
            x: coordinates.x,
            y: coordinates.y,
          });
        }
      });

    // Подписываемся на изменения координат области
    this.mapService.domainCoordinates$
      .pipe(takeUntil(this.destroy$))
      .subscribe((coordinates) => {
        if (coordinates) {
          this.gralGebForm.patchValue({
            westBorder: coordinates.westBorder,
            eastBorder: coordinates.eastBorder,
            southBorder: coordinates.southBorder,
            northBorder: coordinates.northBorder,
          });
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopStatusPolling();
  }

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
      this.isModeling = true;
      this.http
        .post('https://localhost:44373/api/gral/run', {
          InputFile: './computation',
        })
        .subscribe({
          next: () => {
            // Начинаем опрос статуса
            this.startStatusPolling();
          },
          error: (error) => {
            this.isModeling = false;
            this.snackBar.open(
              'Ошибка запуска моделирования: ' + error.message,
              'OK',
              { duration: 5000 }
            );
          },
        });
    } else {
      // Остановка моделирования
      this.http.post('https://localhost:44373/api/gral/stop', {}).subscribe({
        next: () => {
          this.isModeling = false;
          this.stopStatusPolling();
        },
        error: (error) => {
          this.snackBar.open(
            'Ошибка остановки моделирования: ' + error.message,
            'OK',
            { duration: 5000 }
          );
        },
      });
    }
  }

  private startStatusPolling() {
    this.statusPollingSubscription = interval(2000) // Опрос каждые 2 секунды
      .pipe(
        switchMap(() =>
          this.http.get('https://localhost:44373/api/gral/status')
        ),
        takeWhile(() => this.isModeling) // Продолжаем опрос, пока isModeling true
      )
      .subscribe({
        next: (response: any) => {
          const status = response.status;
          if (
            status === 'No simulation is running' ||
            status === 'Simulation stopped' ||
            status === 'Simulation completed successfully'
          ) {
            this.isModeling = false;
            this.stopStatusPolling();
            this.snackBar.open(status, 'OK', { duration: 3000 });

            // Загружаем результаты после успешного завершения
            if (status === 'Simulation completed successfully') {
              this.mapService.setResultIsReady(true);
            }
          }
        },
        error: (error) => {
          this.isModeling = false;
          this.stopStatusPolling();
          this.snackBar.open(
            'Ошибка получения статуса: ' + error.message,
            'OK',
            { duration: 5000 }
          );
        },
      });
  }

  private stopStatusPolling() {
    if (this.statusPollingSubscription) {
      this.statusPollingSubscription.unsubscribe();
      this.statusPollingSubscription = undefined;
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

      try {
        this.computationService.saveAllFiles(data).subscribe({
          next: () => {
            this.isSimulationEnabled = true;
            this.snackBar.open('Все файлы успешно сохранены', 'OK', {
              duration: 3000,
            });
          },
          error: (error) => {
            this.isSimulationEnabled = false;
            this.snackBar.open(
              'Ошибка при сохранении файлов: ' + error.message,
              'OK',
              { duration: 5000 }
            );
          },
        });
      } catch (error: any) {
        this.snackBar.open(
          'Ошибка при сохранении файлов: ' + error.message,
          'OK',
          { duration: 5000 }
        );
      }
    } else {
      this.snackBar.open('Пожалуйста, заполните все формы корректно', 'OK', {
        duration: 3000,
      });
    }
  }

  initPollutantForm() {
    this.pollutantForm = this.fb.group({
      name: [this.pollutants[11], Validators.required],
      type: [1, Validators.required],
      density: [0, [Validators.required, Validators.min(0)]],
      diameter: [0, [Validators.required, Validators.min(0)]],
      depositionVelocity: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private initForm() {
    this.mettseriesForm = this.fb.group({
      records: this.fb.array([
        this.fb.group({
          date: ['2025-05-31T19:00:00.000Z'],
          hour: [1],
          velocity: [3],
          direction: [136],
          sc: [4],
        }),
        this.fb.group({
          date: ['2025-05-31T19:00:00.000Z'],
          hour: [2],
          velocity: [7],
          direction: [135],
          sc: [5],
        }),
      ]),
    });

    // Подписываемся на изменения формы
    this.mettseriesForm.valueChanges.subscribe((value) => {
      if (value && value.records) {
        this.mapService.setMetTimeSeries(value.records);
      }
    });

    // Инициализируем начальные значения
    this.mapService.setMetTimeSeries(
      this.mettseriesForm.get('records')?.value || []
    );
  }

  private loadMetTimeSeries() {
    // Implementation of loadMetTimeSeries method
  }
}
