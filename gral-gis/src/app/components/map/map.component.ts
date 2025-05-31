import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet-draw';
import 'leaflet-easyprint';
import { MapExportService } from './map-export.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
// import 'leaflet-history'; // если появится npm-пакет или подключить вручную

// Исправляем пути к маркерам Leaflet
// default icon in script

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit {
  private map!: L.Map;
  private drawnItems = new L.FeatureGroup();
  private easyPrintControl: any;
  drawControl: any;

  constructor(
    private mapExportService: MapExportService,
    private http: HttpClient,
    private mapService: MapService
  ) {}
  ngOnInit(): void {
    L.Icon.Default.imagePath = 'assets/leaflet/';
  }
  ngAfterViewInit(): void {
    this.map = L.map('map', {
      center: [52.58181587791204, 39.53921411100283],
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

    this.loadHeatData();
    this.map.addLayer(this.drawnItems);

    this.drawControl = new (L.Control as any).Draw({
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
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
    });
    this.map.addControl(this.drawControl);

    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      this.drawnItems.addLayer(e.layer);

      if (e.layer instanceof L.Marker) {
        // Получаем координаты маркера
        const marker = e.layer as L.Marker;
        const latlng = marker.getLatLng();

        // Отправляем координаты в сервис
        this.mapService.setMarkerCoordinates({
          x: latlng.lng,
          y: latlng.lat,
        });
      } else if (e.layer instanceof L.Rectangle) {
        // Получаем координаты прямоугольника
        const rectangle = e.layer as L.Rectangle;
        const bounds = rectangle.getBounds();

        // Отправляем координаты в сервис
        this.mapService.setDomainCoordinates({
          westBorder: bounds.getWest(),
          eastBorder: bounds.getEast(),
          southBorder: bounds.getSouth(),
          northBorder: bounds.getNorth(),
        });
      }
    });

    this.map.on(L.Draw.Event.EDITED, (e: any) => {
      // Можно обработать изменения, если нужно
    });
    this.map.on(L.Draw.Event.DELETED, () => {
      // Очищаем координаты при удалении
      this.mapService.setMarkerCoordinates(null);
      this.mapService.setDomainCoordinates(null);
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

  loadHeatData(): void {
    this.http.get('assets/heatmap_data.json').subscribe((data: any) => {
      (L as any)
        .heatLayer(data, {
          radius: 5, // Половина размера ячейки (5м для cell=10)
          blur: 1, // Лёгкое размытие краёв
          //maxZoom: 18,
          minOpacity: 0.5, // Уменьшает "просвечивание"
          gradient: { 0.1: 'blue', 0.5: 'lime', 1: 'red' }, // Кастомизация
        })
        .addTo(this.map);
    });
  }
}
