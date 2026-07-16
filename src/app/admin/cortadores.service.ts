import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { cortadores } from './cortador.model'; 

@Injectable({
  providedIn: 'root'
})
export class cortadoresService {
  private apiUrl = 'http://localhost:4200/api/cortadores'; 
  
  // Nuevas rutas base para nuestros catálogos
  private apiGruposUrl = 'http://localhost:4200/api/grupos'; 
  private apiLocalidadesUrl = 'http://localhost:4200/api/localidades'; 

  constructor(private http: HttpClient) {}

  // ==========================================
  // MÉTODOS PARA CORTADORES (Originales)
  // ==========================================
  getCortadores(): Observable<cortadores[]> {
    return this.http.get<cortadores[]>(this.apiUrl);
  }

  updateCortador(id: number, cortador: cortadores): Observable<cortadores> {
    return this.http.put<cortadores>(`${this.apiUrl}/${id}`, cortador);
  }

  // Si decides crear la ruta POST y DELETE para cortadores en tu server.ts, 
  // tu landing.ts ya está programado para detectarlos automáticamente con estas funciones:
  createCortador(cortador: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, cortador);
  }

  deleteCortador(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }


  // ==========================================
  // MÉTODOS PARA GRUPOS
  // ==========================================
  getGrupos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiGruposUrl);
  }

  createGrupo(grupo: any): Observable<any> {
    return this.http.post<any>(this.apiGruposUrl, grupo);
  }

  updateGrupo(id: number, grupo: any): Observable<any> {
    return this.http.put<any>(`${this.apiGruposUrl}/${id}`, grupo);
  }

  deleteGrupo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiGruposUrl}/${id}`);
  }


  // ==========================================
  // MÉTODOS PARA LOCALIDADES
  // ==========================================
  getLocalidades(): Observable<any[]> {
    return this.http.get<any[]>(this.apiLocalidadesUrl);
  }

  createLocalidad(localidad: any): Observable<any> {
    return this.http.post<any>(this.apiLocalidadesUrl, localidad);
  }

deleteLocalidad(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiLocalidadesUrl}/${id}`);
  }

 // ==========================================
  // RUTAS PARA ZAFRAS
  // ==========================================
  getZafras() {
    return this.http.get<any[]>(`${this.apiUrl}/zafras`);
  }

  createZafra(zafra: any) {
    return this.http.post<any>(`${this.apiUrl}/zafras`, zafra);
  }

  deleteZafra(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/zafras/${id}`);
  }

  

}