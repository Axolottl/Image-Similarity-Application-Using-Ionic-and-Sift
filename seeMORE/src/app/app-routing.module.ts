import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)},
  { path: 'sign-up', loadChildren: './sign-up/sign-up.module#SignUPPageModule' },
  { path: 'sign-in', loadChildren: './sign-in/sign-in.module#SignINPageModule' },
  { path: 'cam', loadChildren: './cam/cam.module#CamPageModule' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
