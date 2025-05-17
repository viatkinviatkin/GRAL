import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.heat';
// import 'leaflet-history'; // если появится npm-пакет или подключить вручную

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit {
  private map!: L.Map;

  ngAfterViewInit(): void {
    this.map = L.map('map', {
      center: [55.751244, 37.618423],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

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
}
