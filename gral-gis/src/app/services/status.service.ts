import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MapService } from './map.service';

@Injectable({
  providedIn: 'root',
})
export class StatusService {
  constructor(private http: HttpClient, private mapService: MapService) {}
}
