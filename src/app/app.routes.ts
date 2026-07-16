import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { Landing } from './admin/landing/landing';
 
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: Landing },
  { path: '**', redirectTo: 'login' },
];
 