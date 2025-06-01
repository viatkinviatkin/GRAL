import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timeline-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-slider.component.html',
  styleUrl: './timeline-slider.component.scss',
})
export class TimelineSliderComponent implements OnInit {
  @Input() timelineItems: string[] = [];
  @Output() timeChange = new EventEmitter<{ value: number; label: string }>();

  currentValue: number = 1;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    // Устанавливаем CSS-переменную для количества элементов
    this.elementRef.nativeElement.style.setProperty(
      '--timeline-items-count',
      this.timelineItems.length.toString()
    );

    if (this.timelineItems.length > 0) {
      this.timeChange.emit({
        value: this.currentValue,
        label: this.timelineItems[this.currentValue - 1],
      });
    }
  }

  onSliderChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.currentValue = value;
    this.timeChange.emit({
      value: value,
      label: this.timelineItems[value - 1],
    });
  }

  onLabelClick(index: number) {
    this.currentValue = index;
    this.timeChange.emit({
      value: index,
      label: this.timelineItems[index - 1],
    });
  }
}
