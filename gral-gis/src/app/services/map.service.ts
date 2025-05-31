import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MarkerCoordinates {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private markerCoordinates = new BehaviorSubject<MarkerCoordinates | null>(
    null
  );
  markerCoordinates$ = this.markerCoordinates.asObservable();

  setMarkerCoordinates(coordinates: MarkerCoordinates | null) {
    this.markerCoordinates.next(coordinates);
  }
}
