import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ElementRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timeline-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-slider.component.html',
  styleUrl: './timeline-slider.component.scss',
})
export class TimelineSliderComponent implements OnInit, OnChanges {
  @Input() timelineItems: string[] = [];
  @Output() timeChange = new EventEmitter<{ value: number; label: string }>();

  currentValue: number = 1;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.updateTimelineItemsCount();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['timelineItems']) {
      this.updateTimelineItemsCount();
    }
  }

  private updateTimelineItemsCount() {
    this.elementRef.nativeElement.style.setProperty(
      '--timeline-items-count',
      this.timelineItems.length.toString()
    );
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
