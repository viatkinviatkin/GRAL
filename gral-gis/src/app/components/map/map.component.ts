import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet-draw';
import 'leaflet-easyprint';
import { MapExportService } from './map-export.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';
import { TimelineSliderComponent } from '../timeline-slider/timeline-slider.component';
// import 'leaflet-history'; // если появится npm-пакет или подключить вручную

// Исправляем пути к маркерам Leaflet
// default icon in script

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, TimelineSliderComponent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnInit, OnDestroy {
  private map!: L.Map;
  private drawnItems = new L.FeatureGroup();
  private easyPrintControl: any;
  drawControl: any;
  private heatLayers: any[] = [];
  private subscription: Subscription;
  timelineItems: string[] = [];

  constructor(
    private mapExportService: MapExportService,
    private http: HttpClient,
    private mapService: MapService
  ) {
    this.subscription = this.mapService.markerCoordinates$.subscribe(
      (coords) => {
        if (coords) {
          this.addMarker(coords);
        }
      }
    );

    // Подписываемся на изменения timelineItems
    this.mapService.timelineItems$.subscribe((items) => {
      this.timelineItems = items;
    });
  }

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

    this.mapService.resultIsReady$.subscribe((ready) => {
      if (!ready) {
        return;
      }
      this.loadResults('./computation');
    });
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
    this.mapService.setResultIsReady(true);
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

  ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  loadHeatData(): void {
    this.http.get('assets/heatmap_data.json').subscribe((data: any) => {});
  }

  private addMarker(coords: { x: number; y: number }) {
    L.marker([coords.y, coords.x]).addTo(this.map);
  }

  onTimeChange(event: { value: number; label: string }) {
    this.updateHeatLayer(event.value - 1);
  }

  private updateHeatLayer(index: number) {
    // Очищаем предыдущие тепловые карты
    this.clearHeatLayers();

    // Загружаем и отображаем тепловую карту для выбранного времени
    this.loadResults('./computation', index);
  }

  async loadResults(computationPath: string, timeIndex?: number) {
    try {
      const resultFiles = await this.http
        .get<any[]>(
          `${environment.apiUrl}/api/gral/results?computationPath=${computationPath}`
        )
        .toPromise();

      if (!resultFiles || resultFiles.length === 0) {
        console.error('No result files found');
        return;
      }

      // Если указан индекс времени, загружаем только этот файл
      const file = resultFiles[timeIndex || 0];

      if (!file) {
        console.error('No result files found');
        return;
      }

      const resultData = await this.http
        .get<any>(
          `${environment.apiUrl}/api/gral/result/${file.fileName}?computationPath=${computationPath}`
        )
        .toPromise();

      if (!resultData) {
        return;
      }

      const heatLayer = (L as any)
        .heatLayer(resultData, {
          radius: 10,
          blur: 1,
          minOpacity: 0.5,
          gradient: { 0.1: 'blue', 0.5: 'lime', 1: 'red' },
        })
        .addTo(this.map);

      this.heatLayers.push(heatLayer);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  }

  private clearHeatLayers() {
    this.heatLayers.forEach((layer) => {
      this.map.removeLayer(layer);
    });
    this.heatLayers = [];
  }
}
