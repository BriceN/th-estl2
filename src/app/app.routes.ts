import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/homepage/homepage.component').then(
        (m) => m.HomepageComponent
      ),
  },
  {
    path: 'traceur',
    loadComponent: () =>
      import('./components/tracer/tracer.component').then(
        (m) => m.TracerComponent
      ),
  },
  {
    path: 'carte',
    loadComponent: () =>
      import('./components/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
