import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import proj4 from 'proj4';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface MarkerCoordinates {
  x: number;
  y: number;
}

export interface DomainCoordinates {
  westBorder: number;
  eastBorder: number;
  southBorder: number;
  northBorder: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private markerCoordinates = new BehaviorSubject<MarkerCoordinates | null>(
    null
  );
  resultIsReady = new BehaviorSubject<any>(false);
  markerCoordinates$ = this.markerCoordinates.asObservable();
  resultIsReady$ = this.resultIsReady.asObservable();

  private domainCoordinates = new BehaviorSubject<DomainCoordinates | null>(
    null
  );
  domainCoordinates$ = this.domainCoordinates.asObservable();

  // Определяем проекции
  private readonly wgs84 = 'EPSG:4326';
  private readonly webMercator = 'EPSG:3857';

  constructor(private http: HttpClient) {}

  setMarkerCoordinates(coordinates: MarkerCoordinates | null) {
    if (coordinates) {
      // Преобразуем координаты из WGS84 в Web Mercator
      const [x, y] = proj4(this.wgs84, this.webMercator, [
        coordinates.x,
        coordinates.y,
      ]);

      this.markerCoordinates.next({ x, y });
    } else {
      this.markerCoordinates.next(null);
    }
  }

  setDomainCoordinates(coordinates: DomainCoordinates | null) {
    if (coordinates) {
      // Преобразуем все границы из WGS84 в Web Mercator
      const [west, south] = proj4(this.wgs84, this.webMercator, [
        coordinates.westBorder,
        coordinates.southBorder,
      ]);
      const [east, north] = proj4(this.wgs84, this.webMercator, [
        coordinates.eastBorder,
        coordinates.northBorder,
      ]);

      this.domainCoordinates.next({
        westBorder: west,
        eastBorder: east,
        southBorder: south,
        northBorder: north,
      });
    } else {
      this.domainCoordinates.next(null);
    }
  }
}
