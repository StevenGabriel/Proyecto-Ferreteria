import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';

const DEFAULT_CLIENTS = [
  {
    ClienteID: 1,
    TipoContacto: 'Individual',
    CodigoContacto: 'CO0462',
    NombreEmpresa: '',
    Prefijo: '',
    Nombres: 'DANIEL',
    SegundoNombre: '',
    Apellidos: 'RODRIGUEZ',
    Nombre: 'DANIEL RODRIGUEZ',
    RazonSocial: 'DANIEL RODRIGUEZ',
    TipoDocumentoSIAT: 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
    NIT: '4502616-1S',
    Movil: '0',
    TelefonoAlternativo: '',
    LineaFija: '',
    Email: '',
    FechaNacimiento: '',
    AsignadoA: '',
    Direccion: 'Ventas en Mostrador',
    Ciudad: 'Cochabamba',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    ClienteID: 2,
    TipoContacto: 'Empresa',
    CodigoContacto: 'CO0466',
    NombreEmpresa: 'PORTE ASESORIA Y CONFECCION S.R.L.',
    Prefijo: '',
    Nombres: '',
    SegundoNombre: '',
    Apellidos: '',
    Nombre: 'PORTE ASESORIA Y CONFECCION S.R.L.',
    RazonSocial: 'PORTE ASESORIA Y CONFECCION S.R.L.',
    TipoDocumentoSIAT: 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
    NIT: '280376027',
    Movil: '0',
    TelefonoAlternativo: '',
    LineaFija: '',
    Email: 'facturacion@porte.bo',
    FechaNacimiento: '',
    AsignadoA: '',
    Direccion: 'Av. Blanco Galindo Km 4',
    Ciudad: 'Cochabamba',
    createdAt: '2026-09-02T10:30:00.000Z'
  },
  {
    ClienteID: 3,
    TipoContacto: 'Individual',
    CodigoContacto: 'CO0467',
    NombreEmpresa: '',
    Prefijo: 'Sr.',
    Nombres: 'Carlos',
    SegundoNombre: 'Alberto',
    Apellidos: 'Mendoza Ramos',
    Nombre: 'Carlos Alberto Mendoza Ramos',
    RazonSocial: 'CARLOS MENDOZA RAMOS',
    TipoDocumentoSIAT: 'CI - CÉDULA DE IDENTIDAD',
    NIT: '5948302',
    Movil: '68920192',
    TelefonoAlternativo: '',
    LineaFija: '',
    Email: 'carlos.mendoza@gmail.com',
    FechaNacimiento: '1988-05-14',
    AsignadoA: 'Oscar Edgar Claros',
    Direccion: 'Zona Norte, Calle Los Álamos #120',
    Ciudad: 'Cochabamba',
    createdAt: '2026-09-03T14:15:00.000Z'
  },
  {
    ClienteID: 4,
    TipoContacto: 'Empresa',
    CodigoContacto: 'CO0468',
    NombreEmpresa: 'INGENIERÍA & PROYECTOS C&C S.R.L.',
    Prefijo: '',
    Nombres: '',
    SegundoNombre: '',
    Apellidos: '',
    Nombre: 'INGENIERÍA & PROYECTOS C&C S.R.L.',
    RazonSocial: 'INGENIERIA & PROYECTOS C&C S.R.L.',
    TipoDocumentoSIAT: 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
    NIT: '1029384019',
    Movil: '71239847',
    TelefonoAlternativo: '',
    LineaFija: '4458902',
    Email: 'proyectos@cyc.com',
    FechaNacimiento: '',
    AsignadoA: 'Oscar Edgar Claros',
    Direccion: 'Calle Heroínas #450',
    Ciudad: 'Cochabamba',
    createdAt: '2026-09-04T16:45:00.000Z'
  }
];

const SIAT_DOC_TYPES = [
  'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
  'CI - CÉDULA DE IDENTIDAD',
  'PASAPORTE',
  'OTRO DOCUMENTO DE IDENTIDAD'
];

function ClientView() {
  const { isCollapsed } = useSidebar();

  // Clientes sincronizados con POS
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_pos_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c, i) => ({
            ClienteID: c.ClienteID || c.id || i + 1,
            TipoContacto: c.TipoContacto || (c.NombreEmpresa ? 'Empresa' : 'Individual'),
            CodigoContacto: c.CodigoContacto || `CO${String(460 + i + 1).padStart(4, '0')}`,
            NombreEmpresa: c.NombreEmpresa || '',
            Prefijo: c.Prefijo || '',
            Nombres: c.Nombres || c.name || c.Nombre || '',
            SegundoNombre: c.SegundoNombre || '',
            Apellidos: c.Apellidos || '',
            Nombre: c.Nombre || c.name || c.NombreEmpresa || 'Cliente',
            RazonSocial: c.RazonSocial || c.Nombre || c.name || 'SIN NOMBRE',
            TipoDocumentoSIAT: c.TipoDocumentoSIAT || 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
            NIT: c.NIT || c.nit || '0',
            Movil: c.Movil || c.Telefono || c.phone || '0',
            TelefonoAlternativo: c.TelefonoAlternativo || '',
            LineaFija: c.LineaFija || '',
            Email: c.Email || c.email || '',
            FechaNacimiento: c.FechaNacimiento || '',
            AsignadoA: c.AsignadoA || '',
            Direccion: c.Direccion || c.address || '',
            Ciudad: c.Ciudad || 'Cochabamba',
            createdAt: c.createdAt || new Date().toISOString()
          }));
        }
      }
    } catch (e) {
      console.warn('Error leyendo clientes de localStorage:', e);
    }
    return DEFAULT_CLIENTS;
  });

  const persistClients = (newClients) => {
    setClients(newClients);
    try {
      const posFormat = newClients.map(c => ({
        id: c.ClienteID,
        ClienteID: c.ClienteID,
        TipoContacto: c.TipoContacto,
        CodigoContacto: c.CodigoContacto,
        NombreEmpresa: c.NombreEmpresa,
        Prefijo: c.Prefijo,
        Nombres: c.Nombres,
        SegundoNombre: c.SegundoNombre,
        Apellidos: c.Apellidos,
        name: c.Nombre,
        Nombre: c.Nombre,
        RazonSocial: c.RazonSocial,
        TipoDocumentoSIAT: c.TipoDocumentoSIAT,
        nit: c.NIT,
        NIT: c.NIT,
        phone: c.Movil,
        Movil: c.Movil,
        Telefono: c.Movil,
        TelefonoAlternativo: c.TelefonoAlternativo,
        LineaFija: c.LineaFija,
        email: c.Email,
        Email: c.Email,
        FechaNacimiento: c.FechaNacimiento,
        AsignadoA: c.AsignadoA,
        address: c.Direccion,
        Direccion: c.Direccion,
        Ciudad: c.Ciudad,
        createdAt: c.createdAt
      }));
      localStorage.setItem('cyc_pos_clients', JSON.stringify(posFormat));
    } catch (e) {
      console.warn('Error guardando clientes:', e);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Filtros
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterDocType, setFilterDocType] = useState('ALL');
  const [filterTipoContacto, setFilterTipoContacto] = useState('ALL');

  // Visibilidad de columnas
  const [isColumnVisibilityOpen, setIsColumnVisibilityOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    accion: true,
    codigoContacto: true,
    tipo: true,
    nombre: true,
    razonSocial: true,
    nit: true,
    email: true,
    telefono: true,
    direccion: true,
    añadido: true
  });

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Acordeones dentro del modal
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showContactPersons, setShowContactPersons] = useState(false);

  const initialFormState = {
    TipoContacto: 'Individual', // 'Individual' | 'Empresa'
    CodigoContacto: '',
    NombreEmpresa: '',
    Prefijo: '',
    Nombres: '',
    SegundoNombre: '',
    Apellidos: '',
    Movil: '0',
    TelefonoAlternativo: '',
    LineaFija: '',
    Email: '',
    FechaNacimiento: '',
    AsignadoA: '',
    RazonSocial: '',
    TipoDocumentoSIAT: 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
    NIT: '',
    Direccion: '',
    Ciudad: 'Cochabamba'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 659.25;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) { }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    playSuccessSound();
    setTimeout(() => setShowToast(false), 4000);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenActionMenuId(null);
      setIsColumnVisibilityOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (c.CodigoContacto || '').toLowerCase().includes(term) ||
        (c.Nombre || '').toLowerCase().includes(term) ||
        (c.NombreEmpresa || '').toLowerCase().includes(term) ||
        (c.RazonSocial || '').toLowerCase().includes(term) ||
        (c.NIT || '').toLowerCase().includes(term) ||
        (c.Movil || '').toLowerCase().includes(term) ||
        (c.Email || '').toLowerCase().includes(term);

      if (!matchSearch) return false;

      if (filterTipoContacto !== 'ALL' && c.TipoContacto !== filterTipoContacto) return false;
      if (filterDocType === 'WITH_NIT' && (c.NIT === '0' || !c.NIT)) return false;
      if (filterDocType === 'WITHOUT_NIT' && c.NIT !== '0' && c.NIT) return false;

      return true;
    });
  }, [clients, searchTerm, filterDocType, filterTipoContacto]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const generateNextContactCode = () => {
    const nextNum = 462 + clients.length;
    return `CO0${nextNum}`;
  };

  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormState,
      CodigoContacto: generateNextContactCode(),
      Movil: '0'
    });
    setFormError('');
    setShowMoreInfo(false);
    setShowContactPersons(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (clie, e) => {
    e.stopPropagation();
    setSelectedClient(clie);
    setFormData({
      TipoContacto: clie.TipoContacto || (clie.NombreEmpresa ? 'Empresa' : 'Individual'),
      CodigoContacto: clie.CodigoContacto || '',
      NombreEmpresa: clie.NombreEmpresa || '',
      Prefijo: clie.Prefijo || '',
      Nombres: clie.Nombres || clie.Nombre || '',
      SegundoNombre: clie.SegundoNombre || '',
      Apellidos: clie.Apellidos || '',
      Movil: clie.Movil || clie.Telefono || '0',
      TelefonoAlternativo: clie.TelefonoAlternativo || '',
      LineaFija: clie.LineaFija || '',
      Email: clie.Email || '',
      FechaNacimiento: clie.FechaNacimiento || '',
      AsignadoA: clie.AsignadoA || '',
      RazonSocial: clie.RazonSocial || '',
      TipoDocumentoSIAT: clie.TipoDocumentoSIAT || 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
      NIT: clie.NIT || '',
      Direccion: clie.Direccion || '',
      Ciudad: clie.Ciudad || 'Cochabamba'
    });
    setFormError('');
    setShowMoreInfo(false);
    setShowContactPersons(false);
    setIsEditModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenViewModal = (clie, e) => {
    e.stopPropagation();
    setSelectedClient(clie);
    setIsViewModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenDeleteModal = (clie, e) => {
    e.stopPropagation();
    setSelectedClient(clie);
    setIsDeleteModalOpen(true);
    setOpenActionMenuId(null);
  };

  // Auto-completar Razón Social al escribir Nombre o Empresa si el usuario no ha puesto una personalizada
  const handleIndividualNameChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    const fullNameParts = [
      updated.Prefijo,
      updated.Nombres,
      updated.SegundoNombre,
      updated.Apellidos
    ].filter(Boolean).join(' ').trim();

    // Si la razón social estaba vacía o era igual al nombre anterior, sugerir el nuevo nombre
    const prevFullName = [
      formData.Prefijo,
      formData.Nombres,
      formData.SegundoNombre,
      formData.Apellidos
    ].filter(Boolean).join(' ').trim();

    if (!formData.RazonSocial || formData.RazonSocial === prevFullName || formData.RazonSocial === formData.Nombres) {
      updated.RazonSocial = fullNameParts.toUpperCase();
    }
    setFormData(updated);
  };

  const handleCompanyNameChange = (val) => {
    const updated = { ...formData, NombreEmpresa: val };
    if (!formData.RazonSocial || formData.RazonSocial === formData.NombreEmpresa) {
      updated.RazonSocial = val.toUpperCase();
    }
    setFormData(updated);
  };

  // Construir nombre principal legible
  const buildDisplayName = (data) => {
    if (data.TipoContacto === 'Empresa' && data.NombreEmpresa.trim()) {
      return data.NombreEmpresa.trim();
    }
    const parts = [data.Prefijo, data.Nombres, data.SegundoNombre, data.Apellidos].filter(Boolean);
    if (parts.length > 0) return parts.join(' ').trim();
    if (data.RazonSocial.trim()) return data.RazonSocial.trim();
    if (data.NombreEmpresa.trim()) return data.NombreEmpresa.trim();
    return 'CLIENTE SIN NOMBRE';
  };

  const handleCreateClient = (e) => {
    e.preventDefault();

    // Validación flexible: Solo requerir al menos un nombre o razón social o empresa
    const hasIndividualName = formData.Nombres.trim() || formData.Apellidos.trim();
    const hasCompanyName = formData.NombreEmpresa.trim();
    const hasRazonSocial = formData.RazonSocial.trim();

    if (!hasIndividualName && !hasCompanyName && !hasRazonSocial) {
      setFormError('Por favor ingrese al menos el Nombre del cliente o Razón Social para facturación.');
      return;
    }

    const displayName = buildDisplayName(formData);
    const resolvedRazonSocial = formData.RazonSocial.trim() || displayName.toUpperCase();
    const resolvedNIT = formData.NIT.trim() || '0';
    const resolvedMovil = formData.Movil.trim() || '0';
    const resolvedCode = formData.CodigoContacto.trim() || generateNextContactCode();

    const newClient = {
      ClienteID: Date.now(),
      ...formData,
      CodigoContacto: resolvedCode,
      Nombre: displayName,
      RazonSocial: resolvedRazonSocial,
      NIT: resolvedNIT,
      Movil: resolvedMovil,
      createdAt: new Date().toISOString()
    };

    persistClients([newClient, ...clients]);
    triggerToast(`¡Cliente "${displayName}" registrado exitosamente!`);
    setIsAddModalOpen(false);
  };

  const handleUpdateClient = (e) => {
    e.preventDefault();

    const hasIndividualName = formData.Nombres.trim() || formData.Apellidos.trim();
    const hasCompanyName = formData.NombreEmpresa.trim();
    const hasRazonSocial = formData.RazonSocial.trim();

    if (!hasIndividualName && !hasCompanyName && !hasRazonSocial) {
      setFormError('Por favor ingrese al menos el Nombre del cliente o Razón Social.');
      return;
    }

    const displayName = buildDisplayName(formData);
    const resolvedRazonSocial = formData.RazonSocial.trim() || displayName.toUpperCase();
    const resolvedNIT = formData.NIT.trim() || '0';
    const resolvedMovil = formData.Movil.trim() || '0';

    const updated = clients.map(c =>
      c.ClienteID === selectedClient.ClienteID
        ? {
          ...c,
          ...formData,
          Nombre: displayName,
          RazonSocial: resolvedRazonSocial,
          NIT: resolvedNIT,
          Movil: resolvedMovil
        }
        : c
    );

    persistClients(updated);
    triggerToast(`¡Datos del cliente "${displayName}" actualizados!`);
    setIsEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!selectedClient) return;
    if (selectedClient.ClienteID === 1 && selectedClient.NIT === '0') {
      alert('No se puede eliminar el Cliente General por defecto de mostrador.');
      setIsDeleteModalOpen(false);
      return;
    }
    const updated = clients.filter(c => c.ClienteID !== selectedClient.ClienteID);
    persistClients(updated);
    triggerToast('Cliente eliminado del registro.');
    setIsDeleteModalOpen(false);
  };

  const exportToCSV = () => {
    if (filteredClients.length === 0) return;
    const headers = ['ID Contacto', 'Tipo', 'Nombre / Empresa', 'Razon Social Factura', 'Tipo Documento', 'NIT / CI', 'Movil', 'Email', 'Direccion'];
    const rows = filteredClients.map(c => [
      `"${c.CodigoContacto || ''}"`,
      `"${c.TipoContacto || 'Individual'}"`,
      `"${c.Nombre || ''}"`,
      `"${c.RazonSocial || ''}"`,
      `"${c.TipoDocumentoSIAT || 'NIT'}"`,
      `"${c.NIT || '0'}"`,
      `"${c.Movil || '0'}"`,
      `"${c.Email || ''}"`,
      `"${(c.Direccion || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Clientes_Facturacion_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Listado de clientes exportado a CSV.');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '01/09/2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '01/09/2026';
    }
  };

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Componente del Formulario reutilizable en Crear y Editar
  const renderClientFormFields = () => (
    <div className="space-y-4 text-xs">
      {formError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-bold flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{formError}</span>
        </div>
      )}

      {/* Fila 1: Tipo de Contacto | Tipo (Individual vs Empresa) | ID de Contacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
        <div>
          <label className="block text-slate-400 font-bold mb-1">Tipo de Contacto:</label>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-semibold">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Clientes</span>
          </div>
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">Tipo:</label>
          <div className="flex items-center gap-4 py-2">
            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer font-semibold">
              <input
                type="radio"
                name="TipoContacto"
                value="Individual"
                checked={formData.TipoContacto === 'Individual'}
                onChange={() => setFormData({ ...formData, TipoContacto: 'Individual' })}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span>Individual</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer font-semibold">
              <input
                type="radio"
                name="TipoContacto"
                value="Empresa"
                checked={formData.TipoContacto === 'Empresa'}
                onChange={() => setFormData({ ...formData, TipoContacto: 'Empresa' })}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span>Empresa</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">ID de contacto:</label>
          <input
            type="text"
            value={formData.CodigoContacto}
            onChange={(e) => setFormData({ ...formData, CodigoContacto: e.target.value })}
            placeholder="Dejar vacío para autogenerar"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Condicional: Nombre de la Empresa (Solo si Tipo == 'Empresa') */}
      {formData.TipoContacto === 'Empresa' && (
        <div className="bg-blue-950/20 border border-blue-800/40 p-3 rounded-xl animate-fade-in">
          <label className="block text-cyan-300 font-bold mb-1">Nombre de la empresa:*</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <input
              type="text"
              value={formData.NombreEmpresa}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              placeholder="Nombre de la empresa (Ej. PORTE ASESORIA Y CONFECCION S.R.L.)"
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-cyan-700/60 rounded-lg text-white font-bold outline-none focus:border-cyan-400 uppercase"
            />
          </div>
        </div>
      )}

      {/* Fila Nombres: Prefijo | Nombres:* | Segundo nombre | Apellidos */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-slate-400 font-bold mb-1">Prefijo:</label>
          <input
            type="text"
            value={formData.Prefijo}
            onChange={(e) => handleIndividualNameChange('Prefijo', e.target.value)}
            placeholder="Señor, señora, señorita..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">
            Nombres:{formData.TipoContacto === 'Individual' && <span className="text-amber-400">*</span>}
          </label>
          <input
            type="text"
            value={formData.Nombres}
            onChange={(e) => handleIndividualNameChange('Nombres', e.target.value)}
            placeholder="Nombres"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">Segundo nombre:</label>
          <input
            type="text"
            value={formData.SegundoNombre}
            onChange={(e) => handleIndividualNameChange('SegundoNombre', e.target.value)}
            placeholder="Segundo nombre"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">Apellidos:</label>
          <input
            type="text"
            value={formData.Apellidos}
            onChange={(e) => handleIndividualNameChange('Apellidos', e.target.value)}
            placeholder="Apellidos"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Fila Contactos: Móvil cliente:* (Default 0) | Contacto alternativo | Línea fija | Email */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-slate-400 font-bold mb-1">
            Móvil cliente:* <span className="text-[10px] text-slate-500"></span>
          </label>
          <input
            type="text"
            value={formData.Movil}
            onChange={(e) => setFormData({ ...formData, Movil: e.target.value })}
            placeholder="0"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-cyan-300 font-bold outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">Contacto alternativo:</label>
          <input
            type="text"
            value={formData.TelefonoAlternativo}
            onChange={(e) => setFormData({ ...formData, TelefonoAlternativo: e.target.value })}
            placeholder="Número de contacto alternativo"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">Línea fija:</label>
          <input
            type="text"
            value={formData.LineaFija}
            onChange={(e) => setFormData({ ...formData, LineaFija: e.target.value })}
            placeholder="Línea fija"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">Email:</label>
          <input
            type="email"
            value={formData.Email}
            onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
            placeholder="Email para facturación electrónica"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Fila Nacimiento y Asignado a */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-bold mb-1">Fecha de nacimiento:</label>
          <input
            type="date"
            value={formData.FechaNacimiento}
            onChange={(e) => setFormData({ ...formData, FechaNacimiento: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">Asignado a:</label>
          <select
            value={formData.AsignadoA}
            onChange={(e) => setFormData({ ...formData, AsignadoA: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-medium"
          >
            <option value="">Por favor seleccione</option>
            <option value="Oscar Edgar Claros">Oscar Edgar Claros (Administrador)</option>
            <option value="Vendedor Mostrador">Vendedor Mostrador</option>
            <option value="Caja 1">Caja 1</option>
          </select>
        </div>
      </div>

      {/* SECCIÓN FACTURACIÓN */}
      <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
        <h4 className="font-extrabold text-cyan-400 text-xs flex items-center gap-1.5 uppercase tracking-wide">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Datos de Facturación
        </h4>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Razón social:</label>
          <input
            type="text"
            value={formData.RazonSocial}
            onChange={(e) => setFormData({ ...formData, RazonSocial: e.target.value.toUpperCase() })}
            placeholder="Razón social que figurará en la factura (Ej. DANIEL RODRIGUEZ o PORTE ASESORIA Y CONFECCION S.R.L.)"
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-cyan-500 uppercase tracking-wide"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Tipo de Documento de Identidad:</label>
            <select
              value={formData.TipoDocumentoSIAT}
              onChange={(e) => setFormData({ ...formData, TipoDocumentoSIAT: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-semibold"
            >
              {SIAT_DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Número de impuesto / Documento:</label>
            <input
              type="text"
              value={formData.NIT}
              onChange={(e) => setFormData({ ...formData, NIT: e.target.value })}
              placeholder="Ej. 4502616-1S, 280376027 o 0 si no tiene"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Acordeón: Más información */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMoreInfo(!showMoreInfo)}
          className="w-full px-4 py-2.5 bg-slate-950/70 hover:bg-slate-900 flex items-center justify-between text-left font-bold text-slate-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Más información
          </span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showMoreInfo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMoreInfo && (
          <div className="p-4 bg-slate-950/40 border-t border-slate-800 space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Dirección:</label>
                <input
                  type="text"
                  value={formData.Direccion}
                  onChange={(e) => setFormData({ ...formData, Direccion: e.target.value })}
                  placeholder="Calle, avenida, edificio o zona"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ciudad:</label>
                <input
                  type="text"
                  value={formData.Ciudad}
                  onChange={(e) => setFormData({ ...formData, Ciudad: e.target.value })}
                  placeholder="Ej. Cochabamba, La Paz, Santa Cruz"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Acordeón: Agregar personas de contacto */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowContactPersons(!showContactPersons)}
          className="w-full px-4 py-2.5 bg-slate-950/70 hover:bg-slate-900 flex items-center justify-between text-left font-bold text-slate-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Agregar personas de contacto
          </span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showContactPersons ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showContactPersons && (
          <div className="p-4 bg-slate-950/40 border-t border-slate-800 space-y-2 text-slate-400 animate-fade-in text-[11px]">
            <p>Puede registrar contactos de compras, almacén o contabilidad vinculados a este cliente.</p>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-300 font-medium">
              Contacto principal sincronizado con el formulario general.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      <Sidebar activeItem="clientes" />

      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Clientes
              </h1>
              <span className="text-slate-400 text-sm font-medium">
                Administra tus Clientes y datos de Facturación
              </span>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              + Añadir Cliente
            </button>
          </div>

          {/* Tarjeta Filtros Colapsables */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-cyan-400 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filtros</span>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isFiltersOpen ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isFiltersOpen && (
              <div className="p-5 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/40 animate-fade-in text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Tipo de cliente:</label>
                  <select
                    value={filterTipoContacto}
                    onChange={(e) => { setFilterTipoContacto(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-cyan-500/50"
                  >
                    <option value="ALL">Todos (Individual y Empresa)</option>
                    <option value="Individual">Individual</option>
                    <option value="Empresa">Empresa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Tipo de documento de facturación:</label>
                  <select
                    value={filterDocType}
                    onChange={(e) => { setFilterDocType(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-cyan-500/50"
                  >
                    <option value="ALL">Todos los clientes</option>
                    <option value="WITH_NIT">Con NIT / CI (Para Factura)</option>
                    <option value="WITHOUT_NIT">Sin NIT / Venta Mostrador (NIT 0)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => { setFilterDocType('ALL'); setFilterTipoContacto('ALL'); setSearchTerm(''); }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta Principal: Todos sus Clientes */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white tracking-wide">
              Todos sus Clientes
            </h2>

            {/* Barra de Herramientas */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              {/* Mostrar entradas */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span>Mostrar</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entradas</span>
              </div>

              {/* Botones de Exportación */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a CSV
                </button>

                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a Excel
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Impresión
                </button>

                {/* Dropdown Visibilidad */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsColumnVisibilityOpen(!isColumnVisibilityOpen); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Visibilidad de columna
                  </button>

                  {isColumnVisibilityOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-1.5 text-xs animate-fade-in"
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Columnas visibles</span>
                      {Object.keys(visibleColumns).map((colKey) => (
                        <label key={colKey} className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={visibleColumns[colKey]}
                            onChange={() => toggleColumn(colKey)}
                            className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                          />
                          <span className="capitalize">{colKey.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar a PDF
                </button>
              </div>

              {/* Buscador */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por cliente, NIT, email..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Tabla DataTable */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] whitespace-nowrap">
                    <tr>
                      {visibleColumns.accion && <th className="px-4 py-3.5 font-bold">Acción</th>}
                      {visibleColumns.codigoContacto && <th className="px-4 py-3.5 font-bold">ID Contacto</th>}
                      {visibleColumns.tipo && <th className="px-4 py-3.5 font-bold">Tipo</th>}
                      {visibleColumns.nombre && <th className="px-4 py-3.5 font-bold">Nombre / Empresa</th>}
                      {visibleColumns.razonSocial && <th className="px-4 py-3.5 font-bold">Razón Social Factura</th>}
                      {visibleColumns.nit && <th className="px-4 py-3.5 font-bold">NIT / CI</th>}
                      {visibleColumns.email && <th className="px-4 py-3.5 font-bold">Email</th>}
                      {visibleColumns.telefono && <th className="px-4 py-3.5 font-bold">Móvil / Teléfono</th>}
                      {visibleColumns.direccion && <th className="px-4 py-3.5 font-bold">Dirección</th>}
                      {visibleColumns.añadido && <th className="px-4 py-3.5 font-bold">Añadido</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {currentClients.length > 0 ? (
                      currentClients.map((clie) => {
                        const isActionOpen = openActionMenuId === clie.ClienteID;
                        const isCompany = clie.TipoContacto === 'Empresa' || !!clie.NombreEmpresa;
                        return (
                          <tr key={clie.ClienteID} className="hover:bg-slate-900/50 transition-colors whitespace-nowrap">
                            {visibleColumns.accion && (
                              <td className="px-4 py-3 relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(isActionOpen ? null : clie.ClienteID);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] rounded-md shadow transition-colors cursor-pointer"
                                >
                                  <span>Acciones</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>

                                {isActionOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-4 top-10 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in"
                                  >
                                    <button
                                      onClick={(e) => handleOpenViewModal(clie, e)}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      Ver Detalles
                                    </button>
                                    <button
                                      onClick={(e) => handleOpenEditModal(clie, e)}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Editar
                                    </button>
                                    <button
                                      onClick={(e) => handleOpenDeleteModal(clie, e)}
                                      className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                            {visibleColumns.codigoContacto && <td className="px-4 py-3 font-semibold text-slate-200 font-mono">{clie.CodigoContacto || '—'}</td>}
                            {visibleColumns.tipo && (
                              <td className="px-4 py-3">
                                {isCompany ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                                    Empresa
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                    Individual
                                  </span>
                                )}
                              </td>
                            )}
                            {visibleColumns.nombre && (
                              <td className="px-4 py-3 font-bold text-white uppercase">
                                {clie.Nombre || clie.NombreEmpresa || 'SIN NOMBRE'}
                              </td>
                            )}
                            {visibleColumns.razonSocial && (
                              <td className="px-4 py-3 text-slate-300 uppercase font-semibold">
                                {clie.RazonSocial || 'SIN NOMBRE'}
                              </td>
                            )}
                            {visibleColumns.nit && (
                              <td className="px-4 py-3 text-cyan-300 font-mono font-bold">
                                {clie.NIT || '0'}
                              </td>
                            )}
                            {visibleColumns.email && <td className="px-4 py-3 text-slate-400">{clie.Email || '—'}</td>}
                            {visibleColumns.telefono && <td className="px-4 py-3 text-slate-300 font-mono">{clie.Movil || clie.Telefono || '0'}</td>}
                            {visibleColumns.direccion && <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{clie.Direccion || '—'}</td>}
                            {visibleColumns.añadido && <td className="px-4 py-3 text-slate-400">{formatDate(clie.createdAt)}</td>}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500 font-semibold">
                          No se encontraron clientes registrados con estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400 pt-2">
              <div>
                Mostrando {filteredClients.length === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length} entradas
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL AÑADIR (Agregar un nuevo contacto) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Agregar un nuevo contacto
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              {renderClientFormFields()}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 text-xs transition-all cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR (Editar contacto) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Editar contacto: <span className="text-amber-400">{selectedClient?.Nombre}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4">
              {renderClientFormFields()}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 text-xs transition-all cursor-pointer"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER DETALLES */}
      {isViewModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                Ficha de Contacto: {selectedClient.Nombre}
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block font-semibold">Tipo de Contacto:</span>
                  <span className="font-bold text-cyan-400">{selectedClient.TipoContacto || 'Individual'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">ID Contacto:</span>
                  <span className="font-mono font-bold text-white">{selectedClient.CodigoContacto || '—'}</span>
                </div>
                {selectedClient.NombreEmpresa && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block font-semibold">Nombre de la Empresa:</span>
                    <span className="font-bold text-white uppercase">{selectedClient.NombreEmpresa}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-slate-500 block font-semibold">Razón Social para Facturación:</span>
                  <span className="font-bold text-white uppercase">{selectedClient.RazonSocial || 'SIN NOMBRE'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Tipo Documento:</span>
                  <span className="font-semibold text-slate-300">{selectedClient.TipoDocumentoSIAT || 'NIT'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">NIT / CI:</span>
                  <span className="font-mono font-bold text-cyan-400">{selectedClient.NIT || '0'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Móvil / Celular:</span>
                  <span className="font-mono font-semibold text-slate-300">{selectedClient.Movil || '0'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Email:</span>
                  <span className="font-semibold text-slate-300">{selectedClient.Email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Ciudad:</span>
                  <span className="font-semibold text-slate-300">{selectedClient.Ciudad || 'Cochabamba'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Asignado a:</span>
                  <span className="font-semibold text-slate-300">{selectedClient.AsignadoA || 'General'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block font-semibold">Dirección:</span>
                  <span className="font-semibold text-slate-300">{selectedClient.Direccion || '—'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {isDeleteModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-white">¿Eliminar Cliente?</h3>
            <p className="text-xs text-slate-400">
              ¿Estás seguro de que deseas eliminar al cliente <strong className="text-white">{selectedClient.Nombre}</strong>?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">Cancelar</button>
              <button onClick={handleConfirmDelete} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default ClientView;

