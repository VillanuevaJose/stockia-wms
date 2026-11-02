export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RolUsuario = 'admin' | 'almacenero' | 'vendedor'
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA'
export type EstadoCompra = 'PENDIENTE' | 'RECIBIDA' | 'CANCELADA'
export type EstadoVenta = 'PENDIENTE' | 'PAGADA' | 'ANULADA'
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CULQI' | 'OTRO'
export type EstadoPago = 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO' | 'REEMBOLSADO'

export interface Database {
  public: {
    Tables: {
      negocio: {
        Row: {
          id: string
          nombre: string
          ruc: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          ruc?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          ruc?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          id: string
          negocio_id: string | null
          email: string
          nombre_completo: string
          rol: RolUsuario
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          negocio_id?: string | null
          email: string
          nombre_completo: string
          rol?: RolUsuario
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string | null
          email?: string
          nombre_completo?: string
          rol?: RolUsuario
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usuarios_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          }
        ]
      }
      categoria: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          descripcion: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          nombre: string
          descripcion?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          nombre?: string
          descripcion?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categoria_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          }
        ]
      }
      unidad_medida: {
        Row: {
          id: string
          negocio_id: string
          codigo: string
          nombre: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          codigo: string
          nombre: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          codigo?: string
          nombre?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unidad_medida_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          }
        ]
      }
      almacen: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          codigo: string | null
          direccion: string | null
          es_principal: boolean
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          nombre: string
          codigo?: string | null
          direccion?: string | null
          es_principal?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          nombre?: string
          codigo?: string | null
          direccion?: string | null
          es_principal?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'almacen_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          }
        ]
      }
      productos: {
        Row: {
          id: string
          negocio_id: string | null
          categoria_id: string | null
          unidad_medida_id: string | null
          sku: string | null
          codigo_barras: string | null
          nombre: string
          descripcion: string | null
          costo: number
          precio_venta: number
          precio_soles: number
          stock_minimo: number
          stock: number
          imagen_url: string | null
          activo: boolean
          fecha_creacion: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id?: string | null
          categoria_id?: string | null
          unidad_medida_id?: string | null
          sku?: string | null
          codigo_barras?: string | null
          nombre: string
          descripcion?: string | null
          costo?: number
          precio_venta?: number
          precio_soles?: number
          stock_minimo?: number
          stock?: number
          imagen_url?: string | null
          activo?: boolean
          fecha_creacion?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string | null
          categoria_id?: string | null
          unidad_medida_id?: string | null
          sku?: string | null
          codigo_barras?: string | null
          nombre?: string
          descripcion?: string | null
          costo?: number
          precio_venta?: number
          precio_soles?: number
          stock_minimo?: number
          stock?: number
          imagen_url?: string | null
          activo?: boolean
          fecha_creacion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'productos_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'productos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categoria'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'productos_unidad_medida_id_fkey'
            columns: ['unidad_medida_id']
            isOneToOne: false
            referencedRelation: 'unidad_medida'
            referencedColumns: ['id']
          }
        ]
      }
      inventario: {
        Row: {
          id: string
          almacen_id: string
          producto_id: string
          stock_actual: number
          ubicacion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          almacen_id: string
          producto_id: string
          stock_actual?: number
          ubicacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          almacen_id?: string
          producto_id?: string
          stock_actual?: number
          ubicacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inventario_almacen_id_fkey'
            columns: ['almacen_id']
            isOneToOne: false
            referencedRelation: 'almacen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventario_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          }
        ]
      }
      movimiento_inventario: {
        Row: {
          id: string
          negocio_id: string
          tipo: TipoMovimiento
          motivo: string
          usuario_id: string
          almacen_origen_id: string | null
          almacen_destino_id: string | null
          referencia_tipo: string | null
          referencia_id: string | null
          fecha: string
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          tipo: TipoMovimiento
          motivo: string
          usuario_id: string
          almacen_origen_id?: string | null
          almacen_destino_id?: string | null
          referencia_tipo?: string | null
          referencia_id?: string | null
          fecha?: string
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          tipo?: TipoMovimiento
          motivo?: string
          usuario_id?: string
          almacen_origen_id?: string | null
          almacen_destino_id?: string | null
          referencia_tipo?: string | null
          referencia_id?: string | null
          fecha?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'movimiento_inventario_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimiento_inventario_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimiento_inventario_almacen_origen_id_fkey'
            columns: ['almacen_origen_id']
            isOneToOne: false
            referencedRelation: 'almacen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimiento_inventario_almacen_destino_id_fkey'
            columns: ['almacen_destino_id']
            isOneToOne: false
            referencedRelation: 'almacen'
            referencedColumns: ['id']
          }
        ]
      }
      detalle_movimiento: {
        Row: {
          id: string
          movimiento_id: string
          producto_id: string
          cantidad: number
          costo_unitario: number
          created_at: string
        }
        Insert: {
          id?: string
          movimiento_id: string
          producto_id: string
          cantidad: number
          costo_unitario?: number
          created_at?: string
        }
        Update: {
          id?: string
          movimiento_id?: string
          producto_id?: string
          cantidad?: number
          costo_unitario?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'detalle_movimiento_movimiento_id_fkey'
            columns: ['movimiento_id']
            isOneToOne: false
            referencedRelation: 'movimiento_inventario'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'detalle_movimiento_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          }
        ]
      }
      proveedor: {
        Row: {
          id: string
          negocio_id: string
          ruc: string | null
          razon_social: string
          contacto_nombre: string | null
          telefono: string | null
          email: string | null
          direccion: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          ruc?: string | null
          razon_social: string
          contacto_nombre?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          ruc?: string | null
          razon_social?: string
          contacto_nombre?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'proveedor_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          }
        ]
      }
      compra: {
        Row: {
          id: string
          negocio_id: string
          proveedor_id: string
          almacen_destino_id: string
          usuario_id: string
          numero_comprobante: string
          fecha_emision: string
          estado: EstadoCompra
          total: number
          notas: string | null
          movimiento_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          proveedor_id: string
          almacen_destino_id: string
          usuario_id: string
          numero_comprobante: string
          fecha_emision?: string
          estado?: EstadoCompra
          total?: number
          notas?: string | null
          movimiento_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          proveedor_id?: string
          almacen_destino_id?: string
          usuario_id?: string
          numero_comprobante?: string
          fecha_emision?: string
          estado?: EstadoCompra
          total?: number
          notas?: string | null
          movimiento_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'compra_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'compra_proveedor_id_fkey'
            columns: ['proveedor_id']
            isOneToOne: false
            referencedRelation: 'proveedor'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'compra_almacen_destino_id_fkey'
            columns: ['almacen_destino_id']
            isOneToOne: false
            referencedRelation: 'almacen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'compra_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'compra_movimiento_id_fkey'
            columns: ['movimiento_id']
            isOneToOne: false
            referencedRelation: 'movimiento_inventario'
            referencedColumns: ['id']
          }
        ]
      }
      detalle_compra: {
        Row: {
          id: string
          compra_id: string
          producto_id: string
          cantidad: number
          costo_unitario: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          producto_id: string
          cantidad: number
          costo_unitario: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          compra_id?: string
          producto_id?: string
          cantidad?: number
          costo_unitario?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'detalle_compra_compra_id_fkey'
            columns: ['compra_id']
            isOneToOne: false
            referencedRelation: 'compra'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'detalle_compra_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          }
        ]
      }
      cliente: {
        Row: {
          id: string
          negocio_id: string
          tipo_documento: string
          numero_documento: string | null
          nombre_o_razon_social: string
          telefono: string | null
          email: string | null
          direccion: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          tipo_documento?: string
          numero_documento?: string | null
          nombre_o_razon_social: string
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          tipo_documento?: string
          numero_documento?: string | null
          nombre_o_razon_social?: string
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cliente_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          }
        ]
      }
      venta: {
        Row: {
          id: string
          negocio_id: string
          cliente_id: string | null
          almacen_origen_id: string
          usuario_id: string
          serie: string
          correlativo: number
          fecha_emision: string
          estado: EstadoVenta
          subtotal: number
          impuesto: number
          total: number
          movimiento_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          cliente_id?: string | null
          almacen_origen_id: string
          usuario_id: string
          serie?: string
          correlativo: number
          fecha_emision?: string
          estado?: EstadoVenta
          subtotal?: number
          impuesto?: number
          total?: number
          movimiento_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          cliente_id?: string | null
          almacen_origen_id?: string
          usuario_id?: string
          serie?: string
          correlativo?: number
          fecha_emision?: string
          estado?: EstadoVenta
          subtotal?: number
          impuesto?: number
          total?: number
          movimiento_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'venta_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'venta_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'cliente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'venta_almacen_origen_id_fkey'
            columns: ['almacen_origen_id']
            isOneToOne: false
            referencedRelation: 'almacen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'venta_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'venta_movimiento_id_fkey'
            columns: ['movimiento_id']
            isOneToOne: false
            referencedRelation: 'movimiento_inventario'
            referencedColumns: ['id']
          }
        ]
      }
      detalle_venta: {
        Row: {
          id: string
          venta_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          venta_id?: string
          producto_id?: string
          cantidad?: number
          precio_unitario?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'detalle_venta_venta_id_fkey'
            columns: ['venta_id']
            isOneToOne: false
            referencedRelation: 'venta'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'detalle_venta_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          }
        ]
      }
      pago: {
        Row: {
          id: string
          negocio_id: string
          venta_id: string
          metodo: MetodoPago
          monto: number
          moneda: string
          estado: EstadoPago
          culqi_charge_id: string | null
          referencia: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          venta_id: string
          metodo?: MetodoPago
          monto: number
          moneda?: string
          estado?: EstadoPago
          culqi_charge_id?: string | null
          referencia?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          venta_id?: string
          metodo?: MetodoPago
          monto?: number
          moneda?: string
          estado?: EstadoPago
          culqi_charge_id?: string | null
          referencia?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pago_negocio_id_fkey'
            columns: ['negocio_id']
            isOneToOne: false
            referencedRelation: 'negocio'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pago_venta_id_fkey'
            columns: ['venta_id']
            isOneToOne: false
            referencedRelation: 'venta'
            referencedColumns: ['id']
          }
        ]
      }
      auditoria: {
        Row: {
          id: string
          negocio_id: string | null
          usuario_id: string | null
          tabla: string
          registro_id: string | null
          accion: string
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id?: string | null
          usuario_id?: string | null
          tabla: string
          registro_id?: string | null
          accion: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string | null
          usuario_id?: string | null
          tabla?: string
          registro_id?: string | null
          accion?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mi_negocio_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      mi_rol: {
        Args: Record<PropertyKey, never>
        Returns: RolUsuario
      }
      registrar_movimiento: {
        Args: {
          p_negocio_id: string
          p_usuario_id: string
          p_tipo: TipoMovimiento
          p_motivo: string
          p_almacen_origen_id?: string | null
          p_almacen_destino_id?: string | null
          p_detalles?: Json
          p_referencia_tipo?: string | null
          p_referencia_id?: string | null
        }
        Returns: string
      }
      registrar_compra: {
        Args: {
          p_negocio_id: string
          p_usuario_id: string
          p_proveedor_id: string
          p_almacen_destino_id: string
          p_numero_comprobante: string
          p_detalles: Json
          p_notas?: string | null
        }
        Returns: string
      }
      registrar_venta: {
        Args: {
          p_negocio_id: string
          p_usuario_id: string
          p_cliente_id: string
          p_almacen_origen_id: string
          p_serie: string
          p_detalles: Json
          p_metodo_pago?: MetodoPago
          p_culqi_charge_id?: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      rol_usuario: RolUsuario
      tipo_movimiento: TipoMovimiento
      estado_compra: EstadoCompra
      estado_venta: EstadoVenta
      metodo_pago: MetodoPago
      estado_pago: EstadoPago
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
