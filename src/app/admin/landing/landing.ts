import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { cortadoresService } from '../cortadores.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  isDark = false;
  mostrarFormulario = false;
  cortadorEditando: any = null;

  filtroNombre = '';
  filtroZona = '';
  filtroGrupo = '';
  filtroMunicipio = '';
  form = { nombre: '', edad: null as number | null, sexo: '', localidad: '', zona: '', grupo: '' };
  
  rolUsuario = ''; 
  paginaActual = 0;
  itemsPorPagina = 5;

  paginaComunidad = 0;
  itemsPaginaComunidad = 5;

  stats = {
    totalCortadores: 0,
    zonasActivas: 0,
    totalGrupos: 0,
    zonaPrincipal: 'N/A',
    maxCortadores: 0,
  };

  zonas: any[] = [];
  grupos: any[] = [];
  cortadores: any[] = [];
  cortadoresFiltrados: any[] = [];

  graficaActiva: 'municipio' | 'sexo' | 'edad' | 'comunidad' = 'municipio';
  tipoGraficaSub: 'pastel' | 'barras' = 'pastel'; 
  
  datosSexo: any[] = [];
  datosEdad: any[] = [];
  datosComunidad: any[] = [];
  
  // ==========================================
  // CATÁLOGOS DINÁMICOS
  // ==========================================
  municipiosLocales: string[] = [];
  municipiosForaneos: string[] = [];
  
  localidadesCatalogo: any[] = [];
  gruposCatalogo: any[] = [];
  zafrasCatalogo: any[] = [];

  // ==========================================
  // ESTADOS PARA LOS NUEVOS MODALES
  // ==========================================
  mostrarModalGrupos = false;
  mostrarModalLocalidades = false;
  mostrarModalZafras = false; 

  formGrupo = { id_grupo: null as number | null, nombre: '', zona: 'Local' };
  formLocalidad = { nombre: '', es_foranea: false };
  formZafra = { nombre: '', fecha_inicio: '', fecha_fin: '', activa: true };

  mensajeCatalogoExito = '';
  mensajeCatalogoError = '';
  cargandoCatalogo = false;
  
  mensajeErrorForm = '';
  mensajeExitoForm = '';
  cargando = false;

  constructor(
    private router: Router, 
    private cortadoresService: cortadoresService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef 
  ) {}

  @HostListener('window:pageshow', ['$event'])
  onPageShow(event: any) {
    if (isPlatformBrowser(this.platformId) && event.persisted) {
      localStorage.clear();
      window.location.replace('/login');
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      
      const navEntries = window.performance.getEntriesByType('navigation') as any[];
      if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
        localStorage.clear();
        this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }

      const sesion = localStorage.getItem('sesion');
      if (!sesion) {
        this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }

      this.rolUsuario = localStorage.getItem('rol') || 'visitante';
    } else {
      this.rolUsuario = 'visitante';
    }
    
    this.cargarDatosDesdeBD();
  }

  cargarDatosDesdeBD() {
    this.cortadoresService.getLocalidades().subscribe({
      next: (data: any[]) => {
        this.localidadesCatalogo = data;
        this.municipiosLocales = data.filter(l => !l.es_foranea).map(l => l.nombre);
        this.municipiosForaneos = data.filter(l => l.es_foranea).map(l => l.nombre);
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error('Error al cargar localidades:', err)
    });

    this.cortadoresService.getGrupos().subscribe({
      next: (data: any[]) => {
        this.gruposCatalogo = data;
        this.procesarGruposYZonas(); // <-- CORRECCIÓN: Actualiza los grupos cuando llegan de la BD
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error('Error al cargar grupos:', err)
    });

    this.cortadoresService.getCortadores().subscribe({
      next: (data: any[]) => {
        this.cortadores = data.map((c) => ({
          id: c.id,
          nombre: c.nombre_completo,
          edad: c.edad,
          sexo: c.sexo,
          localidad: c.localidad,
          zona: c.es_foraneo ? 'Foráneo' : 'Local',
          grupo: `Grupo ${c.id_grupo}`,
          id_grupo: c.id_grupo,
          ocupacion: c.ocupacion || 'Cortador',
          zafra: c.zafra || '2025-2026'
        }));

        this.procesarGruposYZonas();
        this.filtrar();
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al conectar con la API de cortadores:', err);
      }
    });

    const servicioExtendidos = this.cortadoresService as any;
    if (typeof servicioExtendidos.getZafras === 'function') {
      servicioExtendidos.getZafras().subscribe({
        next: (data: any[]) => {
          this.zafrasCatalogo = data;
          this.cdr.detectChanges(); 
        },
        error: (err: any) => console.error('Error al cargar zafras:', err)
      });
    }
  }

  // ==========================================
  // LÓGICA DE MODALES: ZAFRAS
  // ==========================================
  abrirModalZafras() {
    if (this.rolUsuario !== 'admin') return;
    this.mostrarModalZafras = true;
    this.limpiarMensajesCatalogo();
    this.formZafra = { nombre: '', fecha_inicio: '', fecha_fin: '', activa: true };
  }

  cerrarModalZafras() {
    this.mostrarModalZafras = false;
  }

  guardarNuevaZafra() {
    if (!this.formZafra.nombre) {
      this.mensajeCatalogoError = 'Debes ingresar un nombre para la Zafra';
      return;
    }
    
    this.cargandoCatalogo = true;
    const servicioExtendidos = this.cortadoresService as any;
    servicioExtendidos.createZafra(this.formZafra).subscribe({
      next: (res: any) => {
        this.mensajeCatalogoExito = 'Zafra agregada correctamente';
        this.zafrasCatalogo = [res, ...this.zafrasCatalogo]; 
        this.cdr.detectChanges(); 
        this.formZafra = { nombre: '', fecha_inicio: '', fecha_fin: '', activa: true };
        
        setTimeout(() => { 
          this.mensajeCatalogoExito = ''; 
          this.cargandoCatalogo = false; 
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err: any) => {
        console.error("Error al guardar zafra:", err);
        this.mensajeCatalogoError = err.error?.error || 'Error al guardar la zafra.';
        this.cargandoCatalogo = false;
        this.cdr.detectChanges();
        
        setTimeout(() => { 
          this.mensajeCatalogoError = '';
          this.cdr.detectChanges(); 
        }, 3000);
      }
    });
  }

  eliminarZafra(id: number) {
    if (confirm('¿Seguro que deseas eliminar esta Zafra?')) {
      this.cargandoCatalogo = true;
      const servicioExtendidos = this.cortadoresService as any;
      servicioExtendidos.deleteZafra(id).subscribe({
        next: () => {
          this.mensajeCatalogoExito = 'Zafra eliminada con éxito';
          this.zafrasCatalogo = this.zafrasCatalogo.filter((z: any) => z.id_zafra !== id);
          this.cdr.detectChanges();
          
          setTimeout(() => { 
            this.mensajeCatalogoExito = ''; 
            this.cargandoCatalogo = false;
            this.cdr.detectChanges();
          }, 1500);
        },
        error: (err: any) => {
          this.mensajeCatalogoError = 'Error al eliminar: ' + (err.error?.error || err.message);
          this.cargandoCatalogo = false;
          this.cdr.detectChanges();
     
          setTimeout(() => { 
            this.mensajeCatalogoError = ''; 
            this.cdr.detectChanges(); 
          }, 3000);
        }
      });
    }
  }

  // ==========================================
  // LÓGICA DE MODALES: GRUPOS Y LOCALIDADES
  // ==========================================
  abrirModalLocalidades() {
    if (this.rolUsuario !== 'admin') return;
    this.mostrarModalLocalidades = true;
    this.limpiarMensajesCatalogo();
    this.formLocalidad = { nombre: '', es_foranea: false };
  }

  cerrarModalLocalidades() {
    this.mostrarModalLocalidades = false;
  }

  guardarNuevaLocalidad() {
    if (!this.formLocalidad.nombre) {
      this.mensajeCatalogoError = 'Debes ingresar un nombre para la localidad';
      return;
    }
    
    this.cargandoCatalogo = true;
    this.cortadoresService.createLocalidad(this.formLocalidad).subscribe({
      next: (res: any) => {
        this.mensajeCatalogoExito = 'Localidad agregada correctamente';
        this.localidadesCatalogo = [...this.localidadesCatalogo, res]; 
        this.cargarDatosDesdeBD();
        this.cdr.detectChanges(); 
        this.formLocalidad = { nombre: '', es_foranea: false };
        
        setTimeout(() => { 
          this.mensajeCatalogoExito = ''; 
          this.cargandoCatalogo = false; 
          this.cdr.detectChanges(); 
        }, 1500);
      },
      error: (err) => {
        this.mensajeCatalogoError = err.error?.error || 'Error al guardar la localidad';
        this.cargandoCatalogo = false;
        this.cdr.detectChanges();
        setTimeout(() => { 
          this.mensajeCatalogoError = ''; 
          this.cdr.detectChanges(); 
        }, 3000);
      }
    });
  }

  eliminarLocalidad(id: number) {
    if (confirm('¿Seguro que deseas eliminar permanentemente esta localidad?')) {
      this.cargandoCatalogo = true;
      this.cortadoresService.deleteLocalidad(id).subscribe({
        next: () => {
          this.mensajeCatalogoExito = 'Localidad eliminada con éxito';
          this.localidadesCatalogo = this.localidadesCatalogo.filter((loc: any) => loc.id_localidad !== id);
          this.cargarDatosDesdeBD(); 
          this.cdr.detectChanges(); 
          
          setTimeout(() => { 
            this.mensajeCatalogoExito = ''; 
            this.cargandoCatalogo = false;
            this.cdr.detectChanges();
          }, 1500);
        },
        error: (err) => {
          this.mensajeCatalogoError = 'Error al eliminar: ' + (err.error?.error || err.message);
          this.cargandoCatalogo = false;
          
          this.cdr.detectChanges();
          setTimeout(() => { 
            this.mensajeCatalogoError = ''; 
            this.cdr.detectChanges();
          }, 3000);
        }
      });
    }
  }

  abrirModalGrupos() {
    if (this.rolUsuario !== 'admin') return;
    this.mostrarModalGrupos = true;
    this.limpiarMensajesCatalogo();
    this.formGrupo = { id_grupo: null, nombre: '', zona: 'Local' };
  }

  cerrarModalGrupos() {
    this.mostrarModalGrupos = false;
  }

  guardarNuevoGrupo() {
    if (!this.formGrupo.id_grupo || !this.formGrupo.nombre) {
      this.mensajeCatalogoError = 'Debes ingresar el número (ID) y nombre del grupo';
      return;
    }
    
    this.cargandoCatalogo = true;
    this.cortadoresService.createGrupo(this.formGrupo).subscribe({
      next: (res: any) => {
        this.mensajeCatalogoExito = 'Grupo agregado correctamente';
        this.gruposCatalogo = [...this.gruposCatalogo, res];
        this.cargarDatosDesdeBD();
        this.cdr.detectChanges(); 
        this.formGrupo = { id_grupo: null, nombre: '', zona: 'Local' };
        
        setTimeout(() => { 
          this.mensajeCatalogoExito = ''; 
          this.cargandoCatalogo = false; 
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err) => {
        this.mensajeCatalogoError = err.error?.error || 'Error al guardar el grupo.';
        this.cargandoCatalogo = false;
        this.cdr.detectChanges();
        setTimeout(() => { 
          this.mensajeCatalogoError = '';
          this.cdr.detectChanges();
        }, 3000);
      }
    });
  }

  eliminarGrupo(id: number) {
    if (confirm('¿Seguro que deseas eliminar permanentemente este grupo?')) {
      this.cargandoCatalogo = true;
      this.cortadoresService.deleteGrupo(id).subscribe({
        next: () => {
          this.mensajeCatalogoExito = 'Grupo eliminado con éxito';
          this.gruposCatalogo = this.gruposCatalogo.filter((g: any) => g.id_grupo !== id);
          this.cargarDatosDesdeBD();
          this.cdr.detectChanges(); 
          
          setTimeout(() => { 
            this.mensajeCatalogoExito = ''; 
            this.cargandoCatalogo = false;
            this.cdr.detectChanges();
          }, 1500);
        },
        error: (err) => {
          this.mensajeCatalogoError = 'Error al eliminar: ' + (err.error?.error || err.message);
          this.cargandoCatalogo = false;
          this.cdr.detectChanges();
 
          setTimeout(() => { 
            this.mensajeCatalogoError = ''; 
            this.cdr.detectChanges();
          }, 3000);
        }
      });
    }
  }

  limpiarMensajesCatalogo() {
    this.mensajeCatalogoExito = '';
    this.mensajeCatalogoError = '';
    this.cargandoCatalogo = false;
  }

  // ==========================================
  // MÉTODOS EXISTENTES 
  // ==========================================
  procesarGruposYZonas() {
    // CORRECCIÓN: Unir los IDs de grupos de cortadores Y de la base de datos completa
    const idsCortadores = this.cortadores.map(c => c.id_grupo);
    const idsCatalogo = this.gruposCatalogo.map(g => g.id_grupo);
    
    // Filtramos para evitar valores null o undefined y removemos duplicados
    const idGruposUnicos = [...new Set([...idsCortadores, ...idsCatalogo])].filter(id => id != null);

    this.grupos = idGruposUnicos.map(id => {
      const integrantes = this.cortadores.filter(c => c.id_grupo === id);
      return {
        nombre: `Grupo ${id}`,
        zona: integrantes[0]?.zona || 'Local',
        cortadores: integrantes.length,
        codigo: `G${id}`,
        expanded: false,
        id_grupo: id
      };
    }).sort((a, b) => a.id_grupo - b.id_grupo); // Ordenamos numéricamente

    const zonasUnicas = [...new Set(this.cortadores.map(c => c.zona))];
    const colores = ['#1A3668', '#8CC63F', '#2A55A3', '#68962A', '#112445', '#A5D665'];
    
    this.zonas = zonasUnicas.map((z, index) => ({
      nombre: z,
      cortadores: this.cortadores.filter(c => c.zona === z).length,
      color: colores[index % colores.length]
    }));

    const conteoMunicipios: { [key: string]: number } = {};
    this.cortadores.forEach(c => {
      const muni = c.localidad || 'Sin registro';
      if (muni !== 'Sin registro') {
        conteoMunicipios[muni] = (conteoMunicipios[muni] || 0) + 1;
      }
    });

    let municipioTop = 'Ninguno';
    let maxMuniCount = 0;

    for (const [muni, count] of Object.entries(conteoMunicipios)) {
      if (count > maxMuniCount) {
        municipioTop = muni;
        maxMuniCount = count;
      }
    }

    const totalMunicipiosUnicos = Object.keys(conteoMunicipios).length;

    this.stats.totalCortadores = this.cortadores.length;
    this.stats.totalGrupos = this.grupos.length;
    this.stats.zonasActivas = totalMunicipiosUnicos; 
    this.stats.zonaPrincipal = municipioTop; 
    this.stats.maxCortadores = maxMuniCount; 

    this.calcularGraficasCirculares();
  }

  calcularGraficasCirculares() {
    let masc = 0, fem = 0;
    let joven = 0, adulto = 0, mayor = 0;
    const conteoComunidades: { [key: string]: number } = {};
    const total = this.cortadoresFiltrados.length;

    if (total === 0) {
      this.datosSexo = [];
      this.datosEdad = [];
      this.datosComunidad = [];
      return;
    }

    this.cortadoresFiltrados.forEach(c => {
      if (c.sexo === 'Masculino') masc++;
      else if (c.sexo === 'Femenino') fem++;

      if (c.edad >= 18 && c.edad <= 25) joven++;
      else if (c.edad >= 26 && c.edad <= 40) adulto++;
      else if (c.edad > 40) mayor++;

      const comunidad = c.localidad || 'Sin registro'; 
      conteoComunidades[comunidad] = (conteoComunidades[comunidad] || 0) + 1;
    });

    this.datosSexo = [
      { label: 'Masculino', count: masc, percent: (masc/total)*100, color: '#1A3668' }, 
      { label: 'Femenino', count: fem, percent: (fem/total)*100, color: '#8CC63F' }   
    ];

    this.datosEdad = [
      { label: 'Joven (18-25)', count: joven, percent: (joven/total)*100, color: '#A5D665' }, 
      { label: 'Adulto (26-40)', count: adulto, percent: (adulto/total)*100, color: '#8CC63F' }, 
      { label: 'Adulto Mayor (41+)', count: mayor, percent: (mayor/total)*100, color: '#1A3668' }  
    ];

    const coloresComunidades = ['#112445', '#4B80E6', '#2A55A3', '#A5D665', '#8CC63F'];
    const comunidadesOrdenadas = Object.keys(conteoComunidades).sort((a, b) => conteoComunidades[b] - conteoComunidades[a]);
    
    this.datosComunidad = comunidadesOrdenadas.map((comunidad, index) => {
      const cantidad = conteoComunidades[comunidad];
      const percentExacto = (cantidad / total) * 100;
      let percentVisible = (percentExacto > 0 && percentExacto < 1) ? '< 1' : Math.round(percentExacto).toString();

      return { 
        label: comunidad, 
        count: cantidad, 
        percent: percentExacto, 
        percentVisible: percentVisible, 
        color: coloresComunidades[index % coloresComunidades.length] 
      };
    });
  }

  obtenerGradienteCircular(datos: any[]): string {
    let gradient: string[] = [];
    let start = 0;
    for (let d of datos) {
      if (d.percent > 0) {
        let end = start + d.percent;
        gradient.push(`${d.color} ${start}% ${end}%`);
        start = end;
      }
    }
    return `conic-gradient(${gradient.join(', ')})`;
  }

  toggleTheme() { this.isDark = !this.isDark; }

  salir() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  toggleGrupo(grupo: any) { grupo.expanded = !grupo.expanded; }
  
  get totalPaginas(): number { return Math.ceil(this.grupos.length / this.itemsPorPagina) || 1; }

  get municipiosFiltrados(): string[] {
    if (!this.filtroZona) {
      return [...new Set(this.cortadores.map(c => c.localidad || 'Sin registro'))].sort();
    }
    return [...new Set(this.cortadores.filter(c => c.zona === this.filtroZona).map(c => c.localidad || 'Sin registro'))].sort();
  }

  paginaAnterior() { if (this.paginaActual > 0) this.paginaActual--; }
  
  paginaSiguiente() { 
    if ((this.paginaActual + 1) * this.itemsPorPagina < this.grupos.length) this.paginaActual++;
  }

  filtrar() {
    if (this.filtroMunicipio && this.filtroZona) {
      const perteneceAZona = this.cortadores.some(c => c.zona === this.filtroZona && (c.localidad || 'Sin registro') === this.filtroMunicipio);
      if (!perteneceAZona) this.filtroMunicipio = '';
    }

    this.cortadoresFiltrados = this.cortadores.filter(c => {
      const nombreOk = c.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase());
      const zonaOk = !this.filtroZona || c.zona === this.filtroZona;
      const grupoOk = !this.filtroGrupo || c.grupo === this.filtroGrupo;
      const muniOk = !this.filtroMunicipio || (c.localidad || 'Sin registro') === this.filtroMunicipio;
      return nombreOk && zonaOk && grupoOk && muniOk;
    });
    
    this.calcularGraficasCirculares();
  }

  abrirFormulario() {
    if (this.rolUsuario !== 'admin') return; 
    this.mostrarFormulario = true;
    this.cortadorEditando = null;
    this.mensajeErrorForm = '';
    this.mensajeExitoForm = '';
    this.cargando = false; 
    this.form = { nombre: '', edad: null, sexo: '', localidad: '', zona: '', grupo: '' };
  }
  
  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.cortadorEditando = null;
    this.mensajeErrorForm = '';
    this.mensajeExitoForm = '';
    this.cargando = false; 
    this.cdr.detectChanges(); 
  }
  
  editarCortador(c: any) {
    if (this.rolUsuario !== 'admin') return;
    this.cortadorEditando = c;
    this.mostrarFormulario = true;
    this.mensajeErrorForm = '';
    this.mensajeExitoForm = '';
    this.cargando = false;
    this.form = { nombre: c.nombre, edad: c.edad, sexo: c.sexo, localidad: c.localidad, zona: c.zona, grupo: c.grupo };
  }

  actualizarZonaFormulario() {
    if (!this.form.localidad) {
      this.form.zona = '';
      return;
    }
    const locClean = this.form.localidad.trim().toLowerCase();
    const esLocal = this.municipiosLocales.some(m => m.toLowerCase() === locClean);
    if (esLocal) { this.form.zona = 'Local'; return; }
    
    const esForanea = this.municipiosForaneos.some(m => m.toLowerCase() === locClean);
    if (esForanea) { this.form.zona = 'Foráneo'; return; }
    
    this.form.zona = '';
  }

  guardarCortador() {
    if (this.rolUsuario !== 'admin' || this.cargando) return;
    this.mensajeErrorForm = '';
    this.mensajeExitoForm = '';
    if (!this.form.nombre || !this.form.grupo || !this.form.edad || !this.form.localidad) {
      this.mensajeErrorForm = 'Por favor completa todos los campos requeridos del formulario.';
      return;
    }

    if (this.form.edad < 18) {
      this.mensajeErrorForm = 'No se pueden registrar menores de edad. Debe tener 18 años o más.';
      return;
    }

    this.actualizarZonaFormulario();
    if (!this.form.zona) {
      this.mensajeErrorForm = 'Localidad inválida o incompleta. Por favor escribe el nombre completo de un municipio de la base de datos.';
      return;
    }

    this.cargando = true; 
    const idGrupoNumerico = parseInt(this.form.grupo.replace(/\D/g, '')) || 1;
    
    const cortadorPayload: any = {
      nombre_completo: this.form.nombre,
      edad: this.form.edad,
      sexo: this.form.sexo,
      localidad: this.form.localidad,
      id_grupo: idGrupoNumerico,
      es_foraneo: this.form.zona === 'Foráneo',
      ocupacion: 'Cortador',
      zafra: '2025-2026'
    };

    if (this.cortadorEditando) {
      this.cortadoresService.updateCortador(this.cortadorEditando.id, cortadorPayload).subscribe({
        next: () => {
          this.mensajeExitoForm = '¡El cortador se actualizó con éxito!';
          this.cargando = false; 

          const index = this.cortadores.findIndex(c => c.id === this.cortadorEditando.id);
          if (index !== -1) {
            const nuevaLista = [...this.cortadores];
            nuevaLista[index] = {
              ...nuevaLista[index],
              nombre: this.form.nombre,
              edad: this.form.edad,
              sexo: this.form.sexo,
              localidad: this.form.localidad,
              id_grupo: idGrupoNumerico,
              grupo: `Grupo ${idGrupoNumerico}`,
              zona: this.form.zona
            };
            this.cortadores = nuevaLista; 
          }
          
          this.procesarGruposYZonas();
          this.filtrar();
          this.cdr.detectChanges(); 

          setTimeout(() => { 
            this.cerrarFormulario();
            this.cdr.detectChanges(); 
          }, 500);
        },
        error: (err) => {
          this.mensajeErrorForm = 'Error al actualizar: ' + err.message;
          this.cargando = false; 
          this.cdr.detectChanges(); 
        }
      });
    } else {
      const servicioExtendidos = this.cortadoresService as any;
      if (typeof servicioExtendidos.createCortador === 'function') {
        servicioExtendidos.createCortador(cortadorPayload).subscribe({
          next: (res: any) => {
            this.mensajeExitoForm = '¡El cortador se registró con éxito!';
            this.cargando = false; 
            
            const nuevoCortador = {
              id: res?.id || Date.now(),
              nombre: this.form.nombre,
              edad: this.form.edad,
              sexo: this.form.sexo,
              localidad: this.form.localidad,
              id_grupo: idGrupoNumerico,
              grupo: `Grupo ${idGrupoNumerico}`,
              zona: this.form.zona,
              ocupacion: 'Cortador',
              zafra: '2025-2026'
            };
            this.cortadores = [nuevoCortador, ...this.cortadores]; 
            
            this.procesarGruposYZonas();
            this.filtrar();
            this.cdr.detectChanges(); 

            setTimeout(() => { 
              this.cerrarFormulario();
              this.cdr.detectChanges();
            }, 500);
          },
          error: (err: any) => {
            this.mensajeErrorForm = 'Error al guardar: ' + err.message;
            this.cargando = false;
            this.cdr.detectChanges();
          }
        });
      }
    }
  }

  eliminarCortador(id: number) {
    if (this.rolUsuario !== 'admin') return;
    if (confirm('¿Eliminar este cortador permanentemente de la base de datos?')) {
      const servicioExtendidos = this.cortadoresService as any;
      if (typeof servicioExtendidos.deleteCortador === 'function') {
        servicioExtendidos.deleteCortador(id).subscribe({
          next: () => {
            this.cortadores = this.cortadores.filter(c => c.id !== id);
            this.procesarGruposYZonas();
            this.filtrar();
            this.cdr.detectChanges();
          },
          error: (err: any) => alert('Error al intentar eliminar: ' + err.message)
        });
      }
    }
  }

  // =========================================================
  // LÓGICA DE PAGINACIÓN PARA GRÁFICAS DE COMUNIDAD
  // =========================================================
  get datosComunidadPaginados() {
    const inicio = this.paginaComunidad * this.itemsPaginaComunidad;
    const fin = inicio + this.itemsPaginaComunidad;
    return this.datosComunidad.slice(inicio, fin);
  }

  get totalPaginasComunidad() { return Math.ceil(this.datosComunidad.length / this.itemsPaginaComunidad) || 1; }
  
  paginaAnteriorComunidad() { if (this.paginaComunidad > 0) this.paginaComunidad--; }
  
  paginaSiguienteComunidad() { 
    if ((this.paginaComunidad + 1) * this.itemsPaginaComunidad < this.datosComunidad.length) this.paginaComunidad++;
  }

  obtenerGradienteCircularComunidad(datos: any[]): string {
    let gradient: string[] = [];
    let start = 0;
    const totalCountEnPagina = datos.reduce((sum, d) => sum + d.count, 0);
    if (totalCountEnPagina === 0) return 'conic-gradient(#e5e7eb 0% 100%)';
    
    for (let d of datos) {
      let percentRelativo = (d.count / totalCountEnPagina) * 100;
      let end = start + percentRelativo;
      gradient.push(`${d.color} ${start}% ${end}%`);
      start = end;
    }
    return `conic-gradient(${gradient.join(', ')})`;
  }
}