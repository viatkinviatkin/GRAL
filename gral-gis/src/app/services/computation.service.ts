import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PointDatModel {
  x: number;
  y: number;
  z: number;
  sourceEmission: number;
  exitVelocity: number;
  diameter: number;
  temperature: number;
  sourceGroup: string;
  f25: number;
  f10: number;
  diaMax: number;
  density: number;
  vDep25: number;
  vDep10: number;
  vDepMax: number;
  depConc: number;
}

export interface MettseriesRecord {
  date: string;
  hour: number;
  velocity: number;
  direction: number;
  sc: number;
}

export interface GralGebModel {
  cellSizeX: number;
  cellSizeY: number;
  cellSizeZ: number;
  cellSizeZStretch: number;
  cellsCountX: number;
  cellsCountY: number;
  horizontalSlices: number;
  sourceGroups: string;
  westBorder: number;
  eastBorder: number;
  southBorder: number;
  northBorder: number;
}

export interface PollutantModel {
  name: string;
  type: number;
  density: number;
  diameter: number;
  depositionVelocity: number;
}

@Injectable({
  providedIn: 'root',
})
export class ComputationService {
  private apiUrl = 'https://localhost:44373/api/computation';

  constructor(private http: HttpClient) {}

  savePointDat(data: PointDatModel): Observable<any> {
    return this.http.post(`${this.apiUrl}/point-dat`, data);
  }

  saveMettseries(data: MettseriesRecord[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/mettimeseries`, data);
  }

  saveGralGeb(data: GralGebModel): Observable<any> {
    return this.http.post(`${this.apiUrl}/gral-geb`, data);
  }

  savePollutant(data: PollutantModel): Observable<any> {
    return this.http.post(`${this.apiUrl}/pollutant`, data);
  }

  saveAllFiles(data: {
    pointDat: PointDatModel;
    mettseries: MettseriesRecord[];
    gralGeb: GralGebModel;
    pollutant: PollutantModel;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-all`, data);
  }
}
