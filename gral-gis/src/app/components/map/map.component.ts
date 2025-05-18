import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet-draw';
import html2canvas from 'html2canvas';
// import 'leaflet-history'; // если появится npm-пакет или подключить вручную

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit {
  private map!: L.Map;
  private drawnItems = new L.FeatureGroup();

  ngAfterViewInit(): void {
    this.map = L.map('map', {
      center: [55.751244, 37.618423],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.addLayer(this.drawnItems);

    // Leaflet.draw toolbar
    const drawControl = new (L.Control as any).Draw({
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
      draw: {
        marker: true,
        polygon: {
          allowIntersection: false,
          showArea: false,
          drawError: { color: '#e1e100', message: 'Ошибка полигона!' },
          shapeOptions: { color: 'red', fill: false, weight: 2 },
        },
        polyline: false,
        rectangle: false,
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

    // Заготовка под history layer (если появится)
    // const historyLayer = (L as any).historyLayer(...);
    // historyLayer.addTo(this.map);
  }

  exportMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    html2canvas(mapElement).then((canvas) => {
      const link = document.createElement('a');
      link.download = 'map.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
}
