import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMsg = '';
  currentSlide = 0;
  private carouselInterval: any;

  constructor(private router: Router) {}

  // Asegúrate de que los nombres de los archivos coincidan exactamente (foto1.jpg, etc.)
  images = [
    {
      url: '/carrucel/foto1.jpg', 
      alt: 'Tractores en campo de caña',
      caption: 'Control DFC en CLP',
    },
    {
      url: '/carrucel/foto2.JPG', 
      alt: 'Caña de azúcar',
      caption: 'Gestión de Cortadores',
    },
    {
      url: '/carrucel/foto3.JPG', 
      alt: 'Campo verde',
      caption: 'Ingenio Beta San Miguel Central La Providencia',
    },


  ];

  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage.getItem('sesion') === 'true') {
      this.router.navigate(['/admin'], { replaceUrl: true });
      return; // Detenemos la ejecución aquí para que no inicie el carrusel
    }

    this.startCarousel();
  }

  ngOnDestroy() {
    clearInterval(this.carouselInterval);
  }

  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.images.length;
    }, 4000);
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    clearInterval(this.carouselInterval);
    this.startCarousel();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  login() {
    this.errorMsg = '';
    if (!this.username || !this.password) {
      this.errorMsg = 'Por favor ingresa usuario y contraseña.';
      return;
    }
    
    this.loading = true;
    
    let usuarioValido = false;
    let rolAsignado = '';

    // 1. Evaluar si es Administrador
    if (this.username === 'FBSM_Prov1denci@' && this.password === 'Pr0v1d3nc1@2026') {
      usuarioValido = true;
      rolAsignado = 'admin';
    } 
    // 2. Evaluar si es Invitado (Visitante)
    else if (this.username === 'FBSM_Visitante' && this.password === 'V1s1t@nt3') {
      usuarioValido = true;
      rolAsignado = 'visitante';
    }

    if (usuarioValido) {
      // Se guardan las credenciales en el navegador de manera segura (evitando errores SSR)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sesion', 'true');
        localStorage.setItem('rol', rolAsignado);
      }

      // Redirección súper rápida
      this.router.navigate(['/admin'], { replaceUrl: true }).then((navigated) => {
        if (!navigated && typeof window !== 'undefined') {
          // Si el router falla, hacemos un reemplazo forzado a nivel navegador
          window.location.replace('/admin'); 
        }
      });
    } else {
      this.errorMsg = 'Usuario o contraseña incorrectos.';
    }
    
    this.loading = false;
  }
}