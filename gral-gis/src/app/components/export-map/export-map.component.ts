import { Component } from '@angular/core';
import html2canvas from 'html2canvas';
import { MatButtonModule } from '@angular/material/button';
import { Injectable } from '@angular/core';
import { MapExportService } from '../map/map-export.service';

@Component({
  selector: 'app-export-map',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './export-map.component.html',
  styleUrls: ['./export-map.component.scss'],
})
export class ExportMapComponent {
  constructor(private mapExportService: MapExportService) {}

  exportMap() {
    this.mapExportService.requestExport();
  }
}
