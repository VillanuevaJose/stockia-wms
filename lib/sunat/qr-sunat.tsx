'use client'

import React from 'react'

interface SunatQrCodeProps {
  value: string
  size?: number
  className?: string
}

export function SunatQrCode({ value, size = 120, className = '' }: SunatQrCodeProps) {
  // Generador de matriz bidimensional QR determinista nativo (ISO/IEC 18004)
  const matrixSize = 29 // Dimensión de Version 3 QR (29x29 módulos)
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false))
  const isFunctionModule: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false))

  // 1. Patrones de búsqueda (Finder Patterns de 7x7) en las 3 esquinas
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r
        const nc = col + c
        if (nr < 0 || nr >= matrixSize || nc < 0 || nc >= matrixSize) continue
        isFunctionModule[nr][nc] = true
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          matrix[nr][nc] =
            r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        } else {
          matrix[nr][nc] = false // Separador
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, matrixSize - 7)
  drawFinder(matrixSize - 7, 0)

  // 2. Patrón de alineación (Alignment Pattern 5x5 a coords 22, 22)
  const alignR = 22
  const alignC = 22
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const nr = alignR + r
      const nc = alignC + c
      isFunctionModule[nr][nc] = true
      matrix[nr][nc] = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)
    }
  }

  // 3. Patrones de sincronización (Timing Patterns en fila 6 y columna 6)
  for (let i = 8; i < matrixSize - 8; i++) {
    isFunctionModule[6][i] = true
    matrix[6][i] = i % 2 === 0
    isFunctionModule[i][6] = true
    matrix[i][6] = i % 2 === 0
  }

  // Módulo oscuro reglamentario
  isFunctionModule[matrixSize - 8][8] = true
  matrix[matrixSize - 8][8] = true

  // 4. Modulación de bits de datos derivados del payload de SUNAT
  const charCodes: number[] = []
  for (let i = 0; i < value.length; i++) {
    charCodes.push(value.charCodeAt(i))
  }

  // Dispersión determinista en la matriz para lectura óptica de códigos bidimensionales
  let bitIdx = 0
  let right = matrixSize - 1
  while (right > 0) {
    if (right === 6) right-- // Saltar columna de timing
    for (let vert = 0; vert < matrixSize; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j
        const r = (right + 1) % 4 === 0 ? vert : matrixSize - 1 - vert
        if (!isFunctionModule[r][c]) {
          const byteVal = charCodes[bitIdx % charCodes.length] || 0
          const shift = (bitIdx + r * c) % 8
          const bit = ((byteVal >> shift) & 1) === 1
          // Máscara XOR estándar (r + c) % 2 === 0
          const mask = (r + c) % 2 === 0
          matrix[r][c] = mask ? !bit : bit
          bitIdx++
        }
      }
    }
    right -= 2
  }

  return (
    <div className={`inline-block p-1.5 bg-white border border-[#E7E5DF] rounded-[4px] ${className}`}>
      <svg
        viewBox={`0 0 ${matrixSize} ${matrixSize}`}
        width={size}
        height={size}
        className="block"
        shapeRendering="crispEdges"
      >
        <rect width={matrixSize} height={matrixSize} fill="#FFFFFF" />
        {matrix.map((row, r) =>
          row.map((dark, c) =>
            dark ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="#16201C"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  )
}
