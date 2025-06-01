import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { ExportMapComponent } from './components/export-map/export-map.component';
import { MapComponent } from './components/map/map.component';
import { ParamsFormComponent } from './components/params-form/params-form.component';
import { TimelineSliderComponent } from './components/timeline-slider/timeline-slider.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    FileUploadComponent,
    ExportMapComponent,
    MapComponent,
    ParamsFormComponent,
    TimelineSliderComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {}
