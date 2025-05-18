import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MapExportService {
  private exportSubject = new Subject<void>();
  exportRequested$ = this.exportSubject.asObservable();

  requestExport() {
    this.exportSubject.next();
  }
}
