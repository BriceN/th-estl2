import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-three-cube',
  imports: [],
  templateUrl: './three-cube.component.html',
  styleUrl: './three-cube.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeCubeComponent {
  @Output() cubeInteracted = new EventEmitter<void>();

  onCubeClick(): void {
    // Emit event to parent component
    this.cubeInteracted.emit();
  }
}
