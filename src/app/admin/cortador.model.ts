export interface cortadores {
  id?: number; // Opcional porque al crear uno nuevo, la DB lo genera solo
  id_grupo: number;
  nombre_completo: string;
  edad: number;
  sexo: 'Masculino' | 'Femenino';
  localidad: string;
  es_foraneo: boolean;
  ocupacion?: string; // Por defecto es 'Cortador'
  created_at?: Date;
}