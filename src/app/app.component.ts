import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { IntroModalComponent } from './components/intro-modal/intro-modal.component';
import { ConfettisComponent } from './components/confettis/confettis.component';
import { EndingModalComponent } from './components/ending-modal/ending-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    IntroModalComponent,
    ConfettisComponent,
    EndingModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Chasse au trésor';
}
