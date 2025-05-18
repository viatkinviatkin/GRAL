import { Component } from '@angular/core';
import html2canvas from 'html2canvas';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-export-map',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './export-map.component.html',
  styleUrls: ['./export-map.component.scss'],
})
export class ExportMapComponent {
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
