import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
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
  private domainCoordinates = new BehaviorSubject<DomainCoordinates | null>(
    null
  );
  private resultIsReady = new BehaviorSubject<boolean>(false);
  private metTimeSeries = new BehaviorSubject<any[]>([]);
  private timelineItems = new BehaviorSubject<string[]>([]);

  markerCoordinates$ = this.markerCoordinates.asObservable();
  domainCoordinates$ = this.domainCoordinates.asObservable();
  resultIsReady$ = this.resultIsReady.asObservable();
  metTimeSeries$ = this.metTimeSeries.asObservable();
  timelineItems$ = this.timelineItems.asObservable();

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

  setResultIsReady(ready: boolean) {
    this.resultIsReady.next(ready);
  }

  setMetTimeSeries(series: any[]) {
    this.metTimeSeries.next(series);
    // Обновляем timelineItems при изменении metTimeSeries
    const items = series.map((item) => {
      const date = new Date(item.date);
      const hour = item.hour.toString().padStart(2, '0');
      return `${date.toLocaleDateString()} ${hour}:00`;
    });
    this.timelineItems.next(items);
  }

  getTimelineItems(): Observable<string[]> {
    return this.timelineItems$;
  }
}
