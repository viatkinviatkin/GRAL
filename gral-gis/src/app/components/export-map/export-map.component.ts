import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-export-map',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './export-map.component.html',
  styleUrls: ['./export-map.component.scss'],
})
export class ExportMapComponent {}
