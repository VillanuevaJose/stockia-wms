'use client'

import React, { useState } from 'react'
import { ProductosFiltros } from './ProductosFiltros'
import { ProductosTabla } from './ProductosTabla'
import { ProductoDrawer } from './ProductoDrawer'
import { CargaMasivaModal } from './CargaMasivaModal'
import type { ProductoRow } from '../../lib/queries/productos'

interface CategoriaItem {
  id: string
  nombre: string
}

interface UnidadItem {
  id: string
  codigo: string
  nombre: string
}

interface AlmacenItem {
  id: string
  nombre: string
  codigo: string | null
  es_principal: boolean
}

interface ProductosClientProps {
  productos: ProductoRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  categorias: CategoriaItem[]
  unidades: UnidadItem[]
  almacenes: AlmacenItem[]
}

export function ProductosClient({
  productos,
  total,
  page,
  pageSize,
  totalPages,
  categorias,
  unidades,
  almacenes,
}: ProductosClientProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCargaMasivaOpen, setIsCargaMasivaOpen] = useState(false)
  const [productoEditar, setProductoEditar] = useState<ProductoRow | null>(null)

  const handleOpenNuevo = () => {
    setProductoEditar(null)
    setIsDrawerOpen(true)
  }

  const handleEditar = (producto: ProductoRow) => {
    setProductoEditar(producto)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setProductoEditar(null)
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Acción Rápida */}
      <ProductosFiltros
        categorias={categorias}
        onOpenNuevo={handleOpenNuevo}
        onOpenCargaMasiva={() => setIsCargaMasivaOpen(true)}
      />

      {/* Tabla Densa de Productos */}
      <ProductosTabla
        productos={productos}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onEditar={handleEditar}
      />

      {/* Modal de Carga Masiva (Excel / CSV) */}
      <CargaMasivaModal
        isOpen={isCargaMasivaOpen}
        onClose={() => setIsCargaMasivaOpen(false)}
        almacenes={almacenes}
      />

      {/* Drawer Lateral de Creación / Edición */}
      <ProductoDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        productoEditar={productoEditar}
        categorias={categorias}
        unidades={unidades}
        almacenes={almacenes}
      />
    </div>
  )
}
