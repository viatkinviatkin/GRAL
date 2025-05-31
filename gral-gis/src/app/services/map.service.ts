import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  markerCoordinates$ = this.markerCoordinates.asObservable();

  private domainCoordinates = new BehaviorSubject<DomainCoordinates | null>(
    null
  );
  domainCoordinates$ = this.domainCoordinates.asObservable();

  setMarkerCoordinates(coordinates: MarkerCoordinates | null) {
    this.markerCoordinates.next(coordinates);
  }

  setDomainCoordinates(coordinates: DomainCoordinates | null) {
    this.domainCoordinates.next(coordinates);
  }
}
