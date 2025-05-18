import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet-draw';
import 'leaflet-easyprint';
import { MapExportService } from './map-export.service';
// import 'leaflet-history'; // если появится npm-пакет или подключить вручную

// Исправляем пути к маркерам Leaflet
// default icon in script

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit {
  private map!: L.Map;
  private drawnItems = new L.FeatureGroup();
  private easyPrintControl: any;

  constructor(private mapExportService: MapExportService) {}
  ngOnInit(): void {
    L.Icon.Default.imagePath = 'assets/leaflet/';
  }
  ngAfterViewInit(): void {
    this.map = L.map('map', {
      center: [55.751244, 37.618423],
      zoom: 12,
      attributionControl: false,
    });

    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        crossOrigin: true,
      }
    ).addTo(this.map);

    this.map.addLayer(this.drawnItems);

    // Leaflet.draw toolbar (только прямоугольник)
    const drawControl = new (L.Control as any).Draw({
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
      draw: {
        marker: true,
        rectangle: {
          shapeOptions: { color: 'red', fill: false, weight: 2 },
          showArea: false,
        },
        polygon: false,
        polyline: false,
        circle: false,
        circlemarker: false,
      },
    });
    this.map.addControl(drawControl);

    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      this.drawnItems.addLayer(e.layer);
    });
    this.map.on(L.Draw.Event.EDITED, (e: any) => {
      // Можно обработать изменения, если нужно
    });
    this.map.on(L.Draw.Event.DELETED, (e: any) => {
      // Можно обработать удаление, если нужно
    });

    // Пример heat layer
    const heat = (L as any)
      .heatLayer(
        [
          [55.75, 37.61, 0.5],
          [55.76, 37.62, 0.8],
        ],
        { radius: 25 }
      )
      .addTo(this.map);

    // Добавляем easyPrint control (без кнопки, вызов через метод)
    let printControl = (this.easyPrintControl = (L as any)
      .easyPrint({
        tileLayer: osmLayer,
        sizeModes: ['Current'],
        exportOnly: true,
        hideControlContainer: true,
      })
      .addTo(this.map));

    // Подписка на событие экспорта
    this.mapExportService.exportRequested$.subscribe(() => {
      if (this.easyPrintControl && this.map) {
        this.easyPrintControl.printMap('CurrentSize', 'map-export');
      }
    });

    // Заготовка под history layer (если появится)
    // const historyLayer = (L as any).historyLayer(...);
    // historyLayer.addTo(this.map);
  }
}
