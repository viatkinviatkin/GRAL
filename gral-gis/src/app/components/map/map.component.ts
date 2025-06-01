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

interface StatisticsPoint {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    avg: number;
    max: number;
    min: number;
    std: number;
  };
}

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
  private statisticsLayers: L.Layer[] = [];
  private subscription: Subscription;
  timelineItems: string[] = [];
  showMaxPoints = false;
  showMeanPoints = false;
  showMinPoints = false;
  private currentTimeIndex: number = 0;
  private heatLayer: any;
  private meanLayer: L.LayerGroup = L.layerGroup();
  private maxLayer: L.LayerGroup = L.layerGroup();
  private minLayer: L.LayerGroup = L.layerGroup();

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
      }

      if (e.layer instanceof L.Rectangle) {
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
    this.currentTimeIndex = event.value - 1;
    this.updateHeatLayer(this.currentTimeIndex);
  }

  private updateHeatLayer(index: number) {
    // Очищаем предыдущие тепловые карты
    this.clearHeatLayers();

    // Загружаем и отображаем тепловую карту для выбранного времени
    this.loadResults('./computation', index);
  }

  async loadResults(computationPath: string, timeIndex: number = 0) {
    try {
      if (this.maxLayer) this.map.removeLayer(this.maxLayer);
      if (this.minLayer) this.map.removeLayer(this.minLayer);
      if (this.meanLayer) this.map.removeLayer(this.meanLayer);
      if (this.heatLayer) this.map.removeLayer(this.heatLayer);

      const resultFiles = await this.http
        .get<any[]>(
          `${environment.apiUrl}/api/gral/results?computationPath=${computationPath}`
        )
        .toPromise();

      if (!resultFiles || resultFiles.length === 0) {
        console.error('No result files found');
        return;
      }

      const file = resultFiles[timeIndex as number];

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

      // Сначала рассчитываем статистики
      const { globalMax, globalMin, globalMean } =
        this.calculateAndDisplayStatistics(resultData);

      // Затем обновляем или создаем тепловой слой с правильными min/max

      this.heatLayer = (L as any)
        .heatLayer(resultData, {
          radius: 5,
          //max: globalMax,

          //min: globalMin,
        })
        .addTo(this.map);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  }

  private calculateAndDisplayStatistics(resultData: any[]) {
    // Очищаем предыдущие слои статистик
    this.clearStatisticsLayers();

    // Находим глобальные min, max и mean значения
    const values = resultData.map((point) => point[2]);
    const globalMax = Math.max(...values);
    const globalMin = Math.min(...values);
    const globalMean = values.reduce((a, b) => a + b, 0) / values.length;

    // Сортируем значения для нахождения ближайших к среднему
    const sortedValues = [...values].sort((a, b) => a - b);
    const meanIndex = Math.floor(sortedValues.length / 2);
    const closestToMean = sortedValues[meanIndex];

    // Создаем слои для статистик
    const meanPoints: L.Layer[] = [];
    const maxPoints: L.Layer[] = [];
    const minPoints: L.Layer[] = [];

    // Находим все точки с соответствующими значениями
    resultData.forEach((point) => {
      const value = point[2];
      const [lat, lon] = point;

      // Добавляем точки с максимальным значением
      if (Math.abs(value - globalMax) < 1e-10) {
        const maxMarker = L.circleMarker([lat, lon], {
          radius: 5,
          color: 'red',
          fillColor: 'red',
          fillOpacity: 0.7,
        }).bindPopup(`Максимальная концентрация: ${value.toFixed(4)}`, {
          autoClose: false,
        });
        maxPoints.push(maxMarker);
      }

      // Добавляем точки с минимальным значением
      if (Math.abs(value - globalMin) < 1e-10) {
        const minMarker = L.circleMarker([lat, lon], {
          radius: 5,
          color: 'blue',
          fillColor: 'blue',
          fillOpacity: 0.7,
        }).bindPopup(`Минимальная концентрация: ${value.toFixed(4)}`, {
          autoClose: false,
        });

        minPoints.push(minMarker);
      }

      // Добавляем точки со средним значением (ближайшие к медиане)
      if (Math.abs(value - closestToMean) < 1e-10) {
        const meanMarker = L.circleMarker([lat, lon], {
          radius: 5,
          color: 'green',
          fillColor: 'green',
          fillOpacity: 0.7,
        }).bindPopup(`Средняя концентрация: ${value.toFixed(4)}`, {
          autoClose: false,
        });
        meanPoints.push(meanMarker);
      }
    });

    // Создаем и сохраняем слои
    this.meanLayer = L.layerGroup(meanPoints);
    this.maxLayer = L.layerGroup(maxPoints);
    this.minLayer = L.layerGroup(minPoints);

    // Добавляем слои на карту в зависимости от настроек видимостиhis.showMaxPoints
    this.meanLayer.addTo(this.map);
    this.maxLayer.addTo(this.map);
    this.minLayer.addTo(this.map);
    this.showMaxPoints = true;
    this.showMeanPoints = true;
    this.showMinPoints = true;
    this.openAllPopups();

    // Выводим информацию о найденных значениях
    console.log(`Глобальные статистики для текущего среза:
      Максимальная концентрация: ${globalMax.toFixed(4)} (${
      maxPoints.length
    } точек)
      Минимальная концентрация: ${globalMin.toFixed(4)} (${
      minPoints.length
    } точек)
      Средняя концентрация: ${globalMean.toFixed(4)} (${
      meanPoints.length
    } точек)`);

    return { globalMax, globalMin, globalMean };
  }

  private clearHeatLayers() {
    this.heatLayers.forEach((layer) => {
      this.map.removeLayer(layer);
    });
    this.heatLayers = [];
  }

  private clearStatisticsLayers() {
    if (this.meanLayer) {
      this.map.removeLayer(this.meanLayer);
    }
    if (this.maxLayer) {
      this.map.removeLayer(this.maxLayer);
    }
    if (this.minLayer) {
      this.map.removeLayer(this.minLayer);
    }
  }

  private openAllPopups() {
    // Открываем попапы для всех видимых слоев
    this.meanLayer.getLayers().forEach((marker) => {
      let cmarker = marker as L.CircleMarker;
      cmarker.openPopup(cmarker.getLatLng());
    });
    this.maxLayer.getLayers().forEach((marker) => {
      let cmarker = marker as L.CircleMarker;
      cmarker.openPopup(cmarker.getLatLng());
    });
    this.minLayer.getLayers().forEach((marker) => {
      let cmarker = marker as L.CircleMarker;
      cmarker.openPopup(cmarker.getLatLng());
    });
  }

  toggleMaxPoints() {
    this.showMaxPoints = !this.showMaxPoints;
    if (this.showMaxPoints) {
      this.maxLayer?.addTo(this.map);
    } else {
      this.maxLayer?.remove();
    }
  }

  toggleMinPoints() {
    this.showMinPoints = !this.showMinPoints;
    if (this.showMinPoints) {
      this.minLayer?.addTo(this.map);
    } else {
      this.minLayer?.remove();
    }
  }

  toggleMeanPoints() {
    this.showMeanPoints = !this.showMeanPoints;
    if (this.showMeanPoints) {
      this.meanLayer?.addTo(this.map);
    } else {
      this.meanLayer?.remove();
    }
  }
}
