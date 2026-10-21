import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getDemandForecastReport, getSalesPerformanceReport, getProductForecastDetail } from '../../services/api';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function PredictiveReportsTab() {
  // Configuración del Modelo en lenguaje comercial
  const [model, setModel] = useState('SES'); // 'SES' (Inteligente) | 'SMA' (Promedio) | 'WMA' (Ponderado)
  const [sensitivityPreset, setSensitivityPreset] = useState('NORMAL'); // 'CONSERVATIVE' | 'NORMAL' | 'FAST'
  const [alpha, setAlpha] = useState(0.3);
  const [windowSize, setWindowSize] = useState(7);
  const [horizonDays, setHorizonDays] = useState(30);
  const [period, setPeriod] = useState('daily');
  const [showGuide, setShowGuide] = useState(false); // Toggle guía de uso

  // Datos
  const [forecastData, setForecastData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros de Tabla y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [abcFilter, setAbcFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal de Detalle de Producto / Calibración
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailData, setProductDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalShowFormulas, setModalShowFormulas] = useState(false);

  // Tooltip interactivo de la gráfica histórica y proyecciones
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Cerrar modal con tecla Escape y bloquear scroll del body mientras el modal esté abierto
  useEffect(() => {
    if (!selectedProduct) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedProduct(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedProduct]);

  // Sincronizar preset de sensibilidad
  const handleSensitivityChange = (preset) => {
    setSensitivityPreset(preset);
    if (preset === 'CONSERVATIVE') setAlpha(0.15);
    if (preset === 'NORMAL') setAlpha(0.30);
    if (preset === 'FAST') setAlpha(0.60);
  };

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [fData, pData] = await Promise.all([
        getDemandForecastReport({
          model,
          alpha,
          window: windowSize,
          horizonDays
        }),
        getSalesPerformanceReport({
          period
        })
      ]);

      setForecastData(fData);
      setPerformanceData(pData);
    } catch (error) {
      console.error('Error al cargar datos predictivos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [model, alpha, windowSize, horizonDays, period]);

  // Cargar detalle de producto para modal
  const openProductDetail = async (prod) => {
    setSelectedProduct(prod);
    setLoadingDetail(true);
    setModalShowFormulas(false);
    try {
      const data = await getProductForecastDetail(prod.ProductoID, {
        alpha,
        window: windowSize,
        horizonDays
      });
      setProductDetailData(data);
    } catch (e) {
      console.error('Error al cargar detalle de producto:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filtrado de productos en la tabla
  const filteredProducts = useMemo(() => {
    if (!forecastData?.forecastedProducts) return [];

    const abcMap = {};
    if (performanceData?.productPerformance) {
      performanceData.productPerformance.forEach((p) => {
        abcMap[p.ProductoID] = p.abcClass || 'C';
      });
    }

    return forecastData.forecastedProducts.map((p) => {
      const pAbc = abcMap[p.ProductoID] || 'C';
      return {
        ...p,
        abcClass: pAbc
      };
    }).filter((p) => {
      const text = `${p.Nombre} ${p.CodigoBarras || ''} ${p.Categoria || ''} ${p.Marca || ''}`.toLowerCase();
      const matchSearch = !searchTerm || text.includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (urgencyFilter !== 'ALL' && p.urgencyLevel !== urgencyFilter) return false;
      if (abcFilter !== 'ALL' && p.abcClass !== abcFilter) return false;

      return true;
    });
  }, [forecastData, performanceData, searchTerm, urgencyFilter, abcFilter]);

  // Cálculos de Paginación para la tabla maestra
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  // Resetear página actual si cambian los filtros principales
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, urgencyFilter, abcFilter, itemsPerPage, horizonDays, model]);

  // Generación de PDF Vectorial Real para Plan de Reabastecimiento Sugerido
  const exportForecastPdf = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const todayStr = new Date().toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeStr = new Date().toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalInvestment = filteredProducts.reduce((acc, p) => acc + (parseFloat(p.estimatedPurchaseCost) || 0), 0);
    const totalUnits = filteredProducts.reduce((acc, p) => acc + (parseInt(p.suggestedPurchaseUnits) || 0), 0);

    // Encabezado Corporativo C&C Ferretería (Landscape: 297mm ancho)
    doc.setFillColor(18, 21, 28); // #12151c
    doc.rect(0, 0, 297, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(245, 158, 11); // Amber-500
    doc.text('C&C FERRETERÍA — CASA Y CONSTRUCCIÓN', 14, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(212, 212, 216); // zinc-300
    doc.text(`PLAN DE REABASTECIMIENTO Y COMPRAS SUGERIDAS • HORIZONTE: ${horizonDays} DÍAS`, 14, 17);

    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text(`Fecha de emisión: ${todayStr} ${timeStr}`, 283, 10, { align: 'right' });
    doc.text(`Total en lista: ${filteredProducts.length} productos | Sugerido: +${totalUnits} unid. (Bs. ${totalInvestment.toFixed(2)})`, 283, 17, { align: 'right' });

    const tableBody = filteredProducts.map((p, idx) => {
      const stock = p.StockActual ?? 0;
      const minStock = p.StockMinimo ?? 5;
      const unit = p.Unidad || 'UNID';
      const daily = parseFloat(p.dailyDemandRate ?? 0).toFixed(1);
      const proj = parseFloat(p.projectedDemand ?? 0).toFixed(1);

      let coberturaText = 'Seguro (>30d)';
      if (p.urgencyLevel === 'OUT_OF_STOCK') coberturaText = 'AGOTADO (0d)';
      else if (p.daysUntilStockout <= 7) coberturaText = `Crítico (${p.daysUntilStockout}d)`;
      else if (p.daysUntilStockout <= 15) coberturaText = `Alerta (${p.daysUntilStockout}d)`;
      else if (p.daysUntilStockout <= 30) coberturaText = `Atención (${p.daysUntilStockout}d)`;
      else if (p.daysUntilStockout < 999) coberturaText = `${p.daysUntilStockout} días`;

      const sugerido = p.suggestedPurchaseUnits > 0 ? `+${p.suggestedPurchaseUnits} ${unit}` : 'Cubierto';
      const inversion = p.estimatedPurchaseCost > 0 ? `Bs. ${p.estimatedPurchaseCost.toFixed(2)}` : 'Bs. 0.00';

      return [
        (idx + 1).toString(),
        (p.Nombre || '').toUpperCase(),
        p.CodigoBarras || `PRD-${p.ProductoID}`,
        p.Categoria || 'General',
        `Clase ${p.abcClass || 'C'}`,
        `${stock} ${unit}`,
        `${minStock} ${unit}`,
        `${daily} ${unit}/d`,
        `${proj} ${unit}`,
        coberturaText,
        sugerido,
        inversion
      ];
    });

    autoTable(doc, {
      startY: 28,
      margin: { left: 14, right: 14, bottom: 15 },
      head: [['#', 'PRODUCTO', 'CÓDIGO / SKU', 'CATEGORÍA', 'CLASE', 'STOCK ACT.', 'MÍN.', 'VTA/DÍA', `DEMANDA (${horizonDays}d)`, 'COBERTURA', 'COMPRA SUG.', 'INVERSIÓN']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [24, 28, 38],
        textColor: [245, 158, 11],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left'
      },
      bodyStyles: {
        textColor: [30, 30, 30],
        fontSize: 7,
        rowPageBreak: 'avoid'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'left', cellWidth: 54 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'left', cellWidth: 24 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'right', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 16 },
        7: { halign: 'right', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 22 },
        9: { halign: 'center', cellWidth: 25 },
        10: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        11: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Columna Cobertura (index 9)
          if (data.column.index === 9) {
            const raw = (data.cell.raw || '').toString().toLowerCase();
            if (raw.includes('agotado') || raw.includes('crítico')) {
              data.cell.styles.textColor = [220, 38, 38]; // Rojo
              data.cell.styles.fontStyle = 'bold';
            } else if (raw.includes('alerta') || raw.includes('atención')) {
              data.cell.styles.textColor = [217, 119, 6]; // Ámbar
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [16, 185, 129]; // Verde
            }
          }
          // Columna Compra Sugerida (index 10)
          if (data.column.index === 10) {
            const raw = (data.cell.raw || '').toString();
            if (raw.startsWith('+')) {
              data.cell.styles.textColor = [180, 83, 9]; // Ámbar oscuro
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Columna Inversión (index 11)
          if (data.column.index === 11) {
            const raw = (data.cell.raw || '').toString();
            if (!raw.includes('0.00')) {
              data.cell.styles.textColor = [5, 150, 105]; // Esmeralda
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `C&C Ferretería — Sistema de Planificación de Demanda y Reabastecimiento • Horizonte: ${horizonDays} días • Página ${data.pageNumber} de ${pageCount}`,
          14,
          203
        );
      }
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    doc.save(`Plan_Reabastecimiento_Sugerido_${horizonDays}dias_${fileDate}.pdf`);
  };

  // Exportar Tabla de Pronóstico en formato Excel (CSV con UTF-8 BOM)
  const exportForecastExcel = () => {
    const rows = [
      [
        '#',
        'Producto',
        'Código / SKU',
        'Categoría',
        'Marca',
        'Clasificación Pareto (ABC)',
        'Stock Actual',
        'Stock Mínimo',
        'Unidad',
        'Venta Diaria Aprox.',
        `Demanda Proyectada (${horizonDays} días)`,
        'Días de Cobertura',
        'Nivel de Urgencia',
        'Unidades Sugeridas a Comprar',
        'Inversión Estimada (Bs.)'
      ],
      ...filteredProducts.map((p, idx) => [
        idx + 1,
        p.Nombre || '',
        p.CodigoBarras || `PRD-${p.ProductoID}`,
        p.Categoria || 'General',
        p.Marca || 'Genérico',
        p.abcClass === 'A' ? 'Clase A (Alta Rotación - 80%)' : p.abcClass === 'B' ? 'Clase B (Rotación Regular - 15%)' : 'Clase C (Baja Rotación - 5%)',
        p.StockActual ?? 0,
        p.StockMinimo ?? 5,
        p.Unidad || 'UNID',
        p.dailyDemandRate ?? 0,
        p.projectedDemand ?? 0,
        p.daysUntilStockout >= 999 ? 'Stock suficiente (> 90d)' : `${p.daysUntilStockout} días`,
        p.urgencyLabel || p.urgencyLevel || 'Normal',
        p.suggestedPurchaseUnits ?? 0,
        (p.estimatedPurchaseCost ?? 0).toFixed(2)
      ])
    ];

    const csvContent = '\uFEFF' + rows.map((e) => e.map((val) => `"${val}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const fileDate = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Plan_Reabastecimiento_Sugerido_${horizonDays}dias_${fileDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handler unificado de exportación
  const handleExportForecast = (type) => {
    if (type === 'pdf') {
      exportForecastPdf();
    } else {
      exportForecastExcel();
    }
  };

  // Renderizador SVG de Gráfico de Proyección Temporal
  const renderProjectionChart = () => {
    const timeline = forecastData?.globalTimeline || [];
    if (timeline.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center text-slate-500 text-xs">
          Registra más ventas en el sistema para trazar la curva de demanda histórica y proyectada.
        </div>
      );
    }

    const svgWidth = 860;
    const svgHeight = 320;
    const padLeft = 45;
    const padRight = 35;
    const padTop = 32;
    const padBottom = 40;

    const chartW = svgWidth - padLeft - padRight;
    const chartH = svgHeight - padTop - padBottom;

    const maxVal = Math.max(...timeline.map((d) => Math.max(d.actual || 0, d.fitted || 0, d.forecast || 0)), 10);

    const getX = (index) => padLeft + (index * chartW) / (timeline.length - 1 || 1);
    const getY = (val) => padTop + chartH - ((val || 0) * chartH) / maxVal;

    const historicPoints = [];
    const forecastPoints = [];
    let lastHistoricPoint = null;

    timeline.forEach((d, idx) => {
      const x = getX(idx);
      if (d.type === 'HISTORIC') {
        const y = getY(d.actual || 0);
        historicPoints.push({ x, y, ...d });
        lastHistoricPoint = { x, y: getY(d.fitted || d.actual || 0) };
      } else {
        if (forecastPoints.length === 0 && lastHistoricPoint) {
          forecastPoints.push(lastHistoricPoint);
        }
        const y = getY(d.forecast || 0);
        forecastPoints.push({ x, y, ...d });
      }
    });

    const createPath = (points) => {
      if (points.length === 0) return '';
      return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
    };

    const historicPath = createPath(historicPoints);
    const forecastPath = createPath(forecastPoints);

    const historicArea = historicPoints.length > 0
      ? `${historicPath} L ${historicPoints[historicPoints.length - 1].x} ${padTop + chartH} L ${historicPoints[0].x} ${padTop + chartH} Z`
      : '';

    // Promedio histórico de días con venta > 0
    const historicActuals = historicPoints.map(p => p.actual || 0).filter(v => v > 0);
    const avgVal = historicActuals.length > 0
      ? historicActuals.reduce((a, b) => a + b, 0) / historicActuals.length
      : 0;
    const avgY = getY(avgVal);

    // Top picos históricos filtrando los que estén demasiado pegados en X para evitar solapamiento
    const sortedPeaks = [...historicPoints]
      .filter(p => (p.actual || 0) > 0)
      .sort((a, b) => (b.actual || 0) - (a.actual || 0));

    const topPeaks = [];
    for (const peak of sortedPeaks) {
      if (topPeaks.length >= 3) break;
      const isTooClose = topPeaks.some(p => Math.abs(p.x - peak.x) < 35);
      if (!isTooClose) {
        topPeaks.push(peak);
      }
    }

    // Línea divisora HOY — buscar el índice donde empieza el forecast
    const todayIdx = timeline.findIndex(d => d.type === 'FORECAST');
    const todayX = todayIdx >= 0 ? getX(todayIdx) : (lastHistoricPoint?.x || null);

    return (
      <div className="w-full overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-80 text-zinc-400 select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Zona de proyección sombreada */}
          {todayX && (
            <rect
              x={todayX}
              y={padTop}
              width={svgWidth - padRight - todayX}
              height={chartH}
              fill="#f59e0b"
              fillOpacity="0.05"
              rx="4"
            />
          )}

          {/* Líneas Guía Horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padTop + chartH - p * chartH;
            const val = Math.round(p * maxVal);
            return (
              <g key={i}>
                <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#27272a" strokeDasharray="3 3" />
                <text x={padLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#a1a1aa" className="font-mono tabular-nums font-medium">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Línea de Promedio Histórico */}
          {avgVal > 0 && (
            <g>
              <line
                x1={padLeft} y1={avgY}
                x2={svgWidth - padRight} y2={avgY}
                stroke="#71717a"
                strokeDasharray="6 4"
                strokeOpacity="0.85"
                strokeWidth="1.5"
              />
              <rect x={padLeft + 4} y={avgY - 12} width={108} height={18} rx="4" fill="#0c0e12" stroke="#3f3f46" strokeWidth="1" />
              <text x={padLeft + 10} y={avgY} fontSize="10" fill="#d4d4d8" fontWeight="bold" dominantBaseline="middle" className="font-mono tabular-nums">
                Prom: {Math.round(avgVal)} un/día
              </text>
            </g>
          )}

          {/* Área y Línea Histórica */}
          {historicArea && <path d={historicArea} fill="url(#histGrad)" />}
          {historicPath && <path d={historicPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Línea Proyectada Futura */}
          {forecastPath && (
            <path d={forecastPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Puntos de datos históricos */}
          {historicPoints.map((p, i) => {
            const isHovered = hoveredPoint?.date === p.date && hoveredPoint?.pointType === 'historic';
            return (
              <g key={`hp-${i}`}>
                {/* Círculo visible */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : (p.actual > 0 ? "3.5" : "2.5")}
                  fill={isHovered ? "#34d399" : (p.actual > 0 ? "#10b981" : "#52525b")}
                  stroke="#0c0e12"
                  strokeWidth="2"
                  className="pointer-events-none transition-[r,fill] duration-150"
                />
                {/* Zona de impacto invisible para hover sin parpadeos */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({ ...p, pointType: 'historic' })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Puntos de proyección */}
          {forecastPoints.filter(p => p.date).map((p, i) => {
            const isHovered = hoveredPoint?.date === p.date && hoveredPoint?.pointType === 'forecast';
            return (
              <g key={`fp-${i}`}>
                {/* Círculo visible */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : "3.5"}
                  fill={isHovered ? "#fbbf24" : "#f59e0b"}
                  stroke="#0c0e12"
                  strokeWidth="2"
                  className="pointer-events-none transition-[r,fill] duration-150"
                />
                {/* Zona de impacto invisible para hover sin parpadeos */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({ ...p, pointType: 'forecast' })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Etiquetas de los picos más altos (sin capturar eventos de mouse) */}
          {topPeaks.map((p, i) => {
            const labelY = p.y - 14;
            const safeY = Math.max(padTop + 14, labelY);
            return (
              <g key={`peak-${i}`} pointerEvents="none">
                <rect
                  x={p.x - 20}
                  y={safeY - 12}
                  width={40}
                  height={17}
                  rx="4"
                  fill="#0c0e12"
                  stroke="#10b981"
                  strokeOpacity="0.7"
                  strokeWidth="1"
                />
                <text
                  x={p.x}
                  y={safeY - 1}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#34d399"
                  fontWeight="bold"
                  className="font-mono tabular-nums"
                >
                  {p.actual} un
                </text>
              </g>
            );
          })}

          {/* Línea vertical HOY */}
          {todayX && (
            <g pointerEvents="none">
              <line
                x1={todayX} y1={padTop}
                x2={todayX} y2={padTop + chartH}
                stroke="#a1a1aa"
                strokeDasharray="4 3"
                strokeWidth="1.5"
                strokeOpacity="0.8"
              />
              <rect x={todayX - 22} y={padTop - 4} width={44} height={18} rx="4" fill="#0c0e12" stroke="#f59e0b" strokeWidth="1" />
              <text x={todayX} y={padTop + 8} textAnchor="middle" fontSize="10" fill="#fbbf24" fontWeight="bold" className="font-mono">
                HOY
              </text>
            </g>
          )}

          {/* Etiquetas Eje X */}
          {timeline.filter((_, i) => i % Math.ceil(timeline.length / 8) === 0 || i === timeline.length - 1).map((d, i) => {
            const idx = timeline.indexOf(d);
            const x = getX(idx);
            return (
              <text key={i} x={x} y={svgHeight - 12} textAnchor="middle" fontSize="11" fill="#a1a1aa" className="font-mono tabular-nums font-medium pointer-events-none">
                {d.date ? d.date.slice(5) : ''}
              </text>
            );
          })}

          {/* Tooltip dinámico en SVG (en perfecta sincronía de coordenadas sin jitter) */}
          {hoveredPoint && (() => {
            const isHistoric = hoveredPoint.pointType === 'historic';
            const tipW = 164;
            const tipH = 54;

            // Clamping horizontal dentro del gráfico
            let tipX = hoveredPoint.x - tipW / 2;
            if (tipX < padLeft + 4) tipX = padLeft + 4;
            if (tipX + tipW > svgWidth - padRight - 4) tipX = svgWidth - padRight - 4 - tipW;

            // Posición vertical: arriba por defecto, abajo si está muy cerca del borde superior
            let tipY = hoveredPoint.y - tipH - 12;
            if (tipY < padTop + 4) {
              tipY = hoveredPoint.y + 14;
            }

            const dateStr = hoveredPoint.date || 'Fecha N/A';
            const valStr = isHistoric
              ? `${hoveredPoint.actual || 0} un.`
              : `~${hoveredPoint.forecast || 0} un/día`;

            return (
              <g pointerEvents="none" className="transition-opacity duration-150">
                {/* Guía vertical de mira telescópica */}
                <line
                  x1={hoveredPoint.x}
                  y1={padTop}
                  x2={hoveredPoint.x}
                  y2={padTop + chartH}
                  stroke={isHistoric ? '#10b981' : '#f59e0b'}
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />

                {/* Halo y nodo activo */}
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="10"
                  fill={isHistoric ? '#10b981' : '#f59e0b'}
                  fillOpacity="0.22"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="5.5"
                  fill={isHistoric ? '#34d399' : '#fbbf24'}
                  stroke="#0c0e12"
                  strokeWidth="2"
                />

                {/* Tarjeta emergente */}
                <rect
                  x={tipX}
                  y={tipY}
                  width={tipW}
                  height={tipH}
                  rx="6"
                  fill="#12151c"
                  stroke="#27272a"
                  strokeWidth="1.2"
                />

                {/* Fila 1: Indicador de tipo y Fecha */}
                <circle
                  cx={tipX + 12}
                  cy={tipY + 16}
                  r="3.5"
                  fill={isHistoric ? '#10b981' : '#f59e0b'}
                />
                <text
                  x={tipX + 22}
                  y={tipY + 16}
                  fontSize="11"
                  fill="#d4d4d8"
                  dominantBaseline="middle"
                  className="font-medium"
                >
                  {dateStr}
                </text>
                <text
                  x={tipX + tipW - 10}
                  y={tipY + 16}
                  textAnchor="end"
                  fontSize="9"
                  fill={isHistoric ? '#34d399' : '#fbbf24'}
                  dominantBaseline="middle"
                  className="font-mono font-bold tracking-wider"
                >
                  {isHistoric ? 'VENTA REAL' : 'PROYECCIÓN'}
                </text>

                {/* Separador sutil */}
                <line
                  x1={tipX + 8}
                  y1={tipY + 28}
                  x2={tipX + tipW - 8}
                  y2={tipY + 28}
                  stroke="#27272a"
                  strokeWidth="0.8"
                />

                {/* Fila 2: Valor numérico y subtítulo */}
                <text
                  x={tipX + 10}
                  y={tipY + 42}
                  fontSize="13"
                  fill="#f4f4f5"
                  fontWeight="bold"
                  dominantBaseline="middle"
                  className="font-mono tabular-nums"
                >
                  {valStr}
                </text>
                <text
                  x={tipX + tipW - 10}
                  y={tipY + 42}
                  textAnchor="end"
                  fontSize="10"
                  fill="#71717a"
                  dominantBaseline="middle"
                  className="font-medium"
                >
                  {isHistoric ? 'Registrado' : 'Estimación'}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    );
  };

  const kpis = performanceData?.kpis || {};
  const forecastSummary = forecastData?.summary || {};

  return (
    <div className="space-y-6">

      {/* 0. Panel de Ayuda / Guía de Uso */}
      <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowGuide(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-100">Guía de interpretación del motor predictivo</p>
              <p className="text-xs text-zinc-400">Cómo elegir entre Suavizamiento Exponencial (SES), Promedio Móvil (SMA) y Ponderado (WMA)</p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-transform duration-180 ease-out-expo flex-shrink-0 ${showGuide ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showGuide && (
          <div className="px-5 pb-5 pt-3 border-t border-zinc-800/80 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* SES */}
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <p className="text-xs font-bold text-zinc-100">Inteligente <span className="text-zinc-500 font-mono font-normal">(SES)</span></p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Pondera exponencialmente las ventas recientes. Recomendado cuando un insumo presenta cambios rápidos de rotación.
                </p>
              </div>
              {/* SMA */}
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                  <p className="text-xs font-bold text-zinc-100">Promedio Estable <span className="text-zinc-500 font-mono font-normal">(SMA)</span></p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Calcula la media aritmética de la ventana histórica. Ideal para ferretería básica de demanda constante.
                </p>
              </div>
              {/* WMA */}
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0"></span>
                  <p className="text-xs font-bold text-zinc-100">Ponderado <span className="text-zinc-500 font-mono font-normal">(WMA)</span></p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Asigna mayor peso lineal a los últimos días sin descartar la tendencia base de la semana.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Barra de Control en Lenguaje Comercial */}
      <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
                Planificador de Demanda y Reabastecimiento
              </h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
                CÁLCULO AUTOMÁTICO
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Proyección matemática sobre el historial real de ventas para anticipar quiebres de stock y dimensionar compras.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              title="Recargar datos del servidor"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0c0e12] hover:bg-zinc-800 text-amber-400 border border-zinc-800 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo btn-press cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Recalculando...' : 'Actualizar cálculo'}</span>
            </button>
          </div>
        </div>

        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
          {/* 1. Modo de Cálculo */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 block">Método de proyección</label>
            <div className="grid grid-cols-3 gap-1 bg-[#0c0e12] p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setModel('SES')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  model === 'SES' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Inteligente</span>
                <span className="font-mono text-[9px] opacity-80 font-normal">SES</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('SMA')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  model === 'SMA' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Estable</span>
                <span className="font-mono text-[9px] opacity-80 font-normal">SMA</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('WMA')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  model === 'WMA' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Ponderado</span>
                <span className="font-mono text-[9px] opacity-80 font-normal">WMA</span>
              </button>
            </div>
          </div>

          {/* 2. Sensibilidad a Cambios */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 block">Sensibilidad ante variaciones</label>
            <div className="grid grid-cols-3 gap-1 bg-[#0c0e12] p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => handleSensitivityChange('CONSERVATIVE')}
                className={`py-2 px-1 rounded-lg font-semibold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex items-center justify-center gap-1.5 cursor-pointer ${
                  sensitivityPreset === 'CONSERVATIVE'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Conservadora</span>
              </button>
              <button
                type="button"
                onClick={() => handleSensitivityChange('NORMAL')}
                className={`py-2 px-1 rounded-lg font-semibold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex items-center justify-center gap-1.5 cursor-pointer ${
                  sensitivityPreset === 'NORMAL'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Normal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSensitivityChange('FAST')}
                className={`py-2 px-1 rounded-lg font-semibold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex items-center justify-center gap-1.5 cursor-pointer ${
                  sensitivityPreset === 'FAST'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Reactiva</span>
              </button>
            </div>
          </div>

          {/* 3. Horizonte de Tiempo */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 block">Horizonte de planificación</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(parseInt(e.target.value))}
              className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 font-semibold outline-none focus:border-amber-500/70 transition-colors duration-160 ease-out-expo cursor-pointer"
            >
              <option value="7">Próximos 7 días (Reposición semanal)</option>
              <option value="15">Próximos 15 días (Reposición quincenal)</option>
              <option value="30">Próximos 30 días (Mes completo — Recomendado)</option>
              <option value="60">Próximos 60 días (Plan bimestral)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Demanda Estimada */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Demanda proyectada</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono tabular-nums font-semibold text-[10px] border border-amber-500/25">
              {horizonDays} días
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-zinc-100">
            {forecastSummary.totalForecastedUnits || 0} <span className="text-xs font-sans text-zinc-400 font-normal">unidades</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Volumen total estimado de salida en el horizonte elegido.
          </p>
        </div>

        {/* 2. Presupuesto Sugerido de Compra */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Presupuesto sugerido</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-500/25">
              REORDEN
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-emerald-400">
            Bs. {(forecastSummary.totalRecommendedPurchaseCost || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-400">
            Inversión estimada para cubrir faltantes y stock de seguridad.
          </p>
        </div>

        {/* 3. Productos que se agotarán pronto */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Riesgo de quiebre</span>
            <span className={`px-2 py-0.5 rounded-md font-mono tabular-nums font-bold text-[10px] flex items-center gap-1 ${
              forecastSummary.productsAtRiskOfStockout > 0
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              <span>{forecastSummary.productsAtRiskOfStockout || 0}</span>
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-rose-400">
            {forecastSummary.productsAtRiskOfStockout || 0} <span className="text-xs font-sans text-zinc-400 font-normal">artículos</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Cobertura inferior a 7 días al ritmo de venta actual.
          </p>
        </div>

        {/* 4. Margen de Ganancia */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Rentabilidad bruta</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[10px] font-semibold border border-zinc-700">
              PROMEDIO
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-amber-400">
            {kpis.netMarginPercent || 0}%
          </p>
          <p className="text-[11px] text-zinc-400">
            Utilidad acumulada: <strong className="font-mono tabular-nums text-zinc-200">Bs. {(kpis.grossProfit || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>
      </div>

      {/* 3. Sección de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800/80 pb-3.5">
            <div>
              <h4 className="font-bold text-zinc-100 text-base">
                Curva Histórica y Proyección de Demanda
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Unidades vendidas conectadas con la proyección de los próximos {horizonDays} días.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-emerald-400 rounded-full"></span>
                <span className="text-zinc-300 text-[11px]">Ventas reales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-amber-400 rounded-full"></span>
                <span className="text-amber-300 text-[11px]">Proyección ({model})</span>
              </div>
            </div>
          </div>

          {renderProjectionChart()}
        </div>

        {/* Clasificación Comercial ABC */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-zinc-800/80 pb-3.5">
              <h4 className="font-bold text-zinc-100 text-base">Clasificación Pareto (ABC)</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Aporte relativo de cada grupo a la facturación</p>
            </div>

            <div className="space-y-3 mt-4">
              {/* Clase A */}
              <div className="p-3 bg-[#0c0e12] rounded-xl border border-emerald-500/25 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">A</span>
                    <span>Alta Rotación</span>
                  </div>
                  <span className="font-mono tabular-nums text-emerald-400 font-bold text-[11px]">80% ingresos</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Artículos críticos de facturación. Prioridad máxima de reposición.
                </p>
              </div>

              {/* Clase B */}
              <div className="p-3 bg-[#0c0e12] rounded-xl border border-amber-500/25 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] border border-amber-500/30">B</span>
                    <span>Rotación Regular</span>
                  </div>
                  <span className="font-mono tabular-nums text-amber-400 font-bold text-[11px]">15% ingresos</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Salida constante. Mantener stock de seguridad estándar.
                </p>
              </div>

              {/* Clase C */}
              <div className="p-3 bg-[#0c0e12] rounded-xl border border-zinc-800 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-300">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">C</span>
                    <span>Rotación Ocasional</span>
                  </div>
                  <span className="font-mono tabular-nums text-zinc-400 font-bold text-[11px]">5% ingresos</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Demanda esporádica. Evitar sobrecompra para no inmovilizar capital.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <span>Catálogo evaluado:</span>
            <strong className="font-mono tabular-nums text-zinc-200">{forecastSummary.totalProductsEvaluated || 0} artículos</strong>
          </div>
        </div>
      </div>

      {/* 4. Tabla Maestra de Sugerencias de Compra */}
      <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Plan de Reabastecimiento Sugerido</span>
                <span className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
                  {filteredProducts.length} productos
                </span>
              </h3>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              Ordenado por urgencia de cobertura para generación de órdenes de compra a proveedores.
            </p>
          </div>

          {/* Botones de Exportación (Descargar Excel y Descargar PDF) */}
          <div className="flex items-center gap-1.5 self-start lg:self-auto">
            <button
              onClick={exportForecastExcel}
              className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
              title="Descargar Plan en formato Excel (.csv compatible)"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar Excel</span>
            </button>
            <button
              onClick={exportForecastPdf}
              className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
              title="Descargar Reporte Oficial en formato PDF vectorial"
            >
              <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-400">Urgencia:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs font-semibold outline-none focus:border-amber-500/70 cursor-pointer"
              >
                <option value="ALL">Todos los estados</option>
                <option value="OUT_OF_STOCK">Agotados (0 unid)</option>
                <option value="CRITICAL">Críticos (menos de 7 días)</option>
                <option value="HIGH">Alerta alta (menos de 15 días)</option>
                <option value="MEDIUM">Alerta media (menos de 30 días)</option>
                <option value="OPTIMAL">Stock suficiente (&gt; 30 días)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-400">Pareto:</span>
              <select
                value={abcFilter}
                onChange={(e) => setAbcFilter(e.target.value)}
                className="bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs font-semibold outline-none focus:border-amber-500/70 cursor-pointer"
              >
                <option value="ALL">Todas las clases</option>
                <option value="A">Clase A — Alta rotación</option>
                <option value="B">Clase B — Rotación regular</option>
                <option value="C">Clase C — Baja rotación</option>
              </select>
            </div>

            {/* Selector de Filas por Página */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-400">Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#0c0e12] border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-200 text-xs font-semibold font-mono tabular-nums outline-none focus:border-amber-500/70 cursor-pointer"
              >
                <option value={10}>10 filas</option>
                <option value={20}>20 filas</option>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
                <option value={999999}>Ver todas</option>
              </select>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Buscar producto o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/70 transition-colors duration-160 ease-out-expo"
            />
            <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800/90 bg-[#0c0e12]">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/80 text-zinc-400 text-[11px] font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-3 text-center">ABC</th>
                <th className="py-3 px-3 text-center">Stock actual</th>
                <th className="py-3 px-3 text-center">Venta diaria</th>
                <th className="py-3 px-3 text-center">Demanda ({horizonDays}d)</th>
                <th className="py-3 px-4 text-center">Cobertura</th>
                <th className="py-3 px-4 text-center bg-amber-500/5 text-amber-400 border-x border-amber-500/20">
                  Sugerido a pedir
                </th>
                <th className="py-3 px-4 text-right">Inversión est.</th>
                <th className="py-3 px-3 text-center">Ajuste</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-zinc-500 text-xs">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => {
                  const isStockout = prod.urgencyLevel === 'OUT_OF_STOCK';
                  const isCritical = prod.urgencyLevel === 'CRITICAL';
                  const isHigh = prod.urgencyLevel === 'HIGH';
                  const isMedium = prod.urgencyLevel === 'MEDIUM';

                  return (
                    <tr key={prod.ProductoID} className="hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-zinc-100 truncate">{prod.Nombre}</div>
                        <div className="text-[11px] text-zinc-500 font-mono tabular-nums">
                          {prod.CodigoBarras || `PRD-${prod.ProductoID}`} • {prod.Marca}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          prod.abcClass === 'A'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : prod.abcClass === 'B'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          Clase {prod.abcClass}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold">
                        <span className={prod.StockActual <= prod.StockMinimo ? 'text-amber-400 font-bold' : 'text-zinc-200'}>
                          {prod.StockActual} {prod.Unidad}
                        </span>
                        <span className="text-zinc-500 text-[10px] block font-normal">Mín: {prod.StockMinimo}</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-zinc-200">
                        ~{prod.dailyDemandRate} <span className="text-[10px] text-zinc-500 font-sans font-normal">{prod.Unidad}/d</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-zinc-100">
                        {prod.projectedDemand} <span className="text-zinc-500 text-[10px] font-sans font-normal">{prod.Unidad}</span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono tabular-nums text-[10px] font-bold uppercase border ${
                          isStockout || isCritical
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : isHigh || isMedium
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isStockout || isCritical
                              ? 'bg-rose-400'
                              : isHigh || isMedium
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          }`}></span>
                          <span>
                            {isStockout
                              ? 'Agotado'
                              : isCritical || isHigh || isMedium
                                ? `${prod.daysUntilStockout} días`
                                : 'Seguro (>30d)'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono tabular-nums font-bold bg-amber-500/5 border-x border-amber-500/15">
                        {prod.suggestedPurchaseUnits > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/35 font-bold text-xs">
                            <span>+{prod.suggestedPurchaseUnits}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-sans text-[11px] font-medium">Cubierto</span>
                        )}
                        <span className="text-zinc-500 font-sans text-[10px] font-normal block mt-0.5">{prod.Unidad}</span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-zinc-200 whitespace-nowrap">
                        {prod.estimatedPurchaseCost > 0 ? (
                          <span className="text-emerald-400">
                            Bs. {prod.estimatedPurchaseCost?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                          <span>{prod.modelAccuracy?.bestModel || model}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openProductDetail(prod)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 rounded-lg text-[11px] font-semibold transition-colors duration-160 ease-out-expo btn-press cursor-pointer ml-auto"
                        >
                          Diagnóstico
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador y Resumen de Entradas */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-zinc-400 font-medium">
          <div className="font-mono tabular-nums text-[11px] text-zinc-400">
            Mostrando{' '}
            <span className="text-amber-400 font-bold">{totalItems > 0 ? startIndex + 1 : 0}</span> a{' '}
            <span className="text-amber-400 font-bold">{endIndex}</span> de{' '}
            <span className="text-zinc-200 font-bold">{totalItems}</span> productos
            {totalItems !== (forecastData?.forecastedProducts?.length || 0) && (
              <span className="text-zinc-500 ml-1">
                (filtrados de {forecastData?.forecastedProducts?.length || 0} en catálogo)
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Botón Primera Página */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                className="px-2.5 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer font-bold text-xs"
                title="Primera página"
              >
                «
              </button>

              {/* Botón Anterior */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={validCurrentPage === 1}
                className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer text-xs font-semibold"
              >
                Anterior
              </button>

              {/* Botones numéricos de página */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const shouldShow =
                  page === 1 ||
                  page === totalPages ||
                  (page >= validCurrentPage - 1 && page <= validCurrentPage + 1);

                if (!shouldShow) {
                  if (page === 2 || page === totalPages - 1) {
                    return (
                      <span key={page} className="text-zinc-600 font-mono tabular-nums text-xs px-1 select-none">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg font-mono tabular-nums text-xs font-bold transition-colors duration-160 ease-out-expo btn-press cursor-pointer ${
                      validCurrentPage === page
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                        : 'bg-[#0c0e12] border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              {/* Botón Siguiente */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={validCurrentPage === totalPages}
                className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer text-xs font-semibold"
              >
                Siguiente
              </button>

              {/* Botón Última Página */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="px-2.5 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer font-bold text-xs"
                title="Última página"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Modal de Diagnóstico de Producto (Montado directamente en document.body para centrado de viewport perfecto) */}
      {selectedProduct && createPortal(
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProduct(null);
          }}
        >
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl shadow-black/80 animate-modal-in max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3.5 sticky top-0 bg-[#12151c] z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded font-mono text-[10px] font-semibold uppercase">
                    DIAGNÓSTICO DE DEMANDA
                  </span>
                  <h3 className="text-base font-bold text-zinc-100">{selectedProduct.Nombre}</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  SKU: <span className="font-mono text-amber-400">{selectedProduct.CodigoBarras || `PRD-${selectedProduct.ProductoID}`}</span> • Marca: {selectedProduct.Marca}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-zinc-400 hover:text-zinc-100 font-bold text-base cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors duration-160 ease-out-expo btn-press"
                title="Cerrar (Esc)"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Analizando series históricas del producto...
              </div>
            ) : productDetailData ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#0c0e12] rounded-xl border border-zinc-800/90 space-y-2">
                  <div className="font-bold text-zinc-200 text-xs">Resumen operativo:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-[#12151c] p-3 rounded-lg border border-zinc-800/80">
                      <span className="text-zinc-400 text-[10px] font-semibold block">Stock disponible</span>
                      <strong className="font-mono tabular-nums text-zinc-100 text-base">{selectedProduct.StockActual} {selectedProduct.Unidad}</strong>
                    </div>
                    <div className="bg-[#12151c] p-3 rounded-lg border border-zinc-800/80">
                      <span className="text-zinc-400 text-[10px] font-semibold block">Tasa de salida diaria</span>
                      <strong className="font-mono tabular-nums text-amber-400 text-base">~{selectedProduct.dailyDemandRate} {selectedProduct.Unidad}/día</strong>
                    </div>
                    <div className="bg-[#12151c] p-3 rounded-lg border border-zinc-800/80">
                      <span className="text-zinc-400 text-[10px] font-semibold block">Autonomía estimada</span>
                      <strong className={`font-mono tabular-nums text-base ${selectedProduct.daysUntilStockout <= 7 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {selectedProduct.daysUntilStockout >= 999 ? '> 90 días' : `~${selectedProduct.daysUntilStockout} días`}
                      </strong>
                    </div>
                  </div>
                </div>

                {productDetailData?.models && (
                  <div className="p-4 bg-[#0c0e12] rounded-xl border border-zinc-800/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 text-xs">Comparativa matemática de error retrospectivo</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                        CALIBRADO
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-zinc-900 text-zinc-400 font-semibold border-b border-zinc-800">
                          <tr>
                            <th className="py-2 px-3">Modelo</th>
                            <th className="py-2 px-3 text-center">Tasa proyectada</th>
                            <th className="py-2 px-3 text-center">MAD</th>
                            <th className="py-2 px-3 text-center">RMSE</th>
                            <th className="py-2 px-3 text-center">MAPE</th>
                            <th className="py-2 px-3 text-center">Selección</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/70">
                          {[
                            { key: 'SES', label: 'Suavizamiento Exponencial (SES)' },
                            { key: 'SMA', label: 'Promedio Móvil Simple (SMA)' },
                            { key: 'WMA', label: 'Promedio Móvil Ponderado (WMA)' }
                          ].map(({ key, label }) => {
                            const mData = productDetailData.models[key] || {};
                            const isBest = selectedProduct.modelAccuracy?.bestModel === key;
                            const isActive = model === key;

                            return (
                              <tr key={key} className={isBest ? 'bg-emerald-500/5' : ''}>
                                <td className="py-2 px-3 font-semibold text-zinc-200">
                                  {label} {isActive && <span className="text-[10px] text-amber-400 font-mono">(Activo)</span>}
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums font-bold text-zinc-100">
                                  ~{mData.nextRate ?? mData.rate ?? 0} {selectedProduct.Unidad}/d
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums text-zinc-300">
                                  ±{mData.MAD ?? 0}
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums text-zinc-400">
                                  {mData.RMSE ?? 0}
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums text-zinc-300">
                                  {mData.MAPE ?? 0}%
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {isBest ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/30">
                                      ★ Óptimo
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500 text-[10px]">Válido</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-[#0c0e12] rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-amber-400 font-semibold block text-[11px]">Sugerencia de orden de compra ({horizonDays} días):</span>
                    <p className="text-zinc-100 text-sm font-bold mt-0.5">
                      {selectedProduct.suggestedPurchaseUnits > 0 ? (
                        <>Solicitar <span className="font-mono tabular-nums text-amber-400 underline">{selectedProduct.suggestedPurchaseUnits} {selectedProduct.Unidad}</span> a proveedor</>
                      ) : (
                        <span className="text-emerald-400">Stock suficiente para cubrir el horizonte seleccionado.</span>
                      )}
                    </p>
                    {selectedProduct.suggestedPurchaseUnits > 0 && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-mono tabular-nums">
                        Inversión estimada: <strong className="text-emerald-400">Bs. {selectedProduct.estimatedPurchaseCost}</strong> (Costo unit.: Bs. {selectedProduct.PrecioCompra})
                      </p>
                    )}
                  </div>
                  <Link
                    to="/productsView"
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors duration-160 ease-out-expo btn-press self-end sm:self-auto"
                  >
                    Ir a inventario →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PredictiveReportsTab;
