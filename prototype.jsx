import React, { useState, useEffect, useRef, useMemo, createContext, useContext, useCallback } from 'react';
import { 
  Clock, Search, CheckSquare, Cloud, FileText, Timer, Target, Calendar, 
  Lock, Link2, Activity, Settings, Plus, Trash2, Eye, EyeOff,
  ChevronLeft, ChevronRight, X, RotateCcw, Copy, Layers, GripVertical,
  Sun, Moon, Droplets, Wind, Zap, Github, Mail, Youtube,
  Cpu, HardDrive, Edit3, Check, Maximize2,
  Image, Palette, Shuffle, Upload, Play, Coffee,
  Phone, Users, AlertCircle, BarChart3, TrendingUp,
  Globe, Bell, Info, AlertTriangle, CheckCircle, XCircle, Volume2, VolumeX,
  SkipBack, SkipForward, Pause, Repeat, Shuffle as ShuffleIcon, Music,
  Video, Rss, ListMusic, Maximize, Minimize
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ===== DESIGN SYSTEM =====
const createTheme = (accent, accentLight, accentDark, surfaceAlpha = 0.12) => ({
  accent, accentLight, accentDark,
  success: accent, successBg: `${accent}20`, checkmark: accent,
  surface: `rgba(255, 255, 255, ${surfaceAlpha})`,
  surfaceHover: `rgba(255, 255, 255, ${surfaceAlpha + 0.06})`,
  surfaceSolid: 'rgba(20, 20, 30, 0.95)',
  text: '#ffffff', textMuted: 'rgba(255, 255, 255, 0.7)', textSubtle: 'rgba(255, 255, 255, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.3)', glow: `${accent}66`,
  warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
});

const themes = {
  aurora: createTheme('#7c3aed', '#a78bfa', '#5b21b6'),
  sakura: createTheme('#ec4899', '#f472b6', '#be185d', 0.15),
  midnight: createTheme('#06b6d4', '#22d3ee', '#0891b2', 0.08),
  forest: createTheme('#22c55e', '#4ade80', '#16a34a', 0.10),
  sunset: createTheme('#f97316', '#fb923c', '#ea580c', 0.12),
  ocean: createTheme('#0ea5e9', '#38bdf8', '#0284c7', 0.10),
};

const defaultBackgrounds = {
  aurora: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  sakura: 'linear-gradient(135deg, #2d1b3d 0%, #1f1f3d 50%, #1a1a2e 100%)',
  midnight: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0a0a0a 100%)',
  forest: 'linear-gradient(135deg, #0a1f0a 0%, #1a2f1a 50%, #0f1f0f 100%)',
  sunset: 'linear-gradient(135deg, #1a0a0a 0%, #2d1a1a 50%, #1f0f0f 100%)',
  ocean: 'linear-gradient(135deg, #0a1a2e 0%, #0f2540 50%, #0a1525 100%)',
};

const sampleBackgroundImages = [
  { id: 'mountains', name: '山脈', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
  { id: 'stars', name: '星空', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80' },
  { id: 'forest', name: '森林', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
  { id: 'ocean', name: '海', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80' },
];

const STOP_REASONS = [
  { id: 'complete', label: '完了', icon: Check, color: 'var(--accent)' },
  { id: 'break', label: '休憩', icon: Coffee, color: 'var(--warning)' },
  { id: 'interrupted', label: '割込み', icon: AlertCircle, color: 'var(--danger)' },
  { id: 'meeting', label: '会議', icon: Users, color: 'var(--info)' },
  { id: 'call', label: '電話', icon: Phone, color: '#a855f7' },
];

// ===== GLOBAL STYLES (including hover states) =====
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400&family=Noto+Sans+JP:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
    ::selection { background: var(--accent); color: white; }
    
    /* Focus states for accessibility */
    button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    
    /* Hover states */
    .hover-lift:hover { transform: translateY(-2px); }
    .hover-glow:hover { box-shadow: 0 0 20px var(--glow); }
    .hover-bright:hover { filter: brightness(1.1); }
    .hover-scale:hover { transform: scale(1.02); }
    .hover-bg:hover { background: var(--surfaceHover) !important; }
    
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
    @keyframes bannerIn { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    @keyframes tickerScroll { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
  `}</style>
);

// ===== NOTIFICATION CONTEXT =====
const NotificationContext = createContext(null);

const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [banner, setBanner] = useState(null);
  const [toastPosition, setToastPosition] = useState('bottom-right');

  // Fix #1: Use functional update to avoid stale closure
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, duration: 5000, ...toast };
    setToasts(prev => [...prev, newToast]);
    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    }
    return id;
  }, []);

  const showModal = useCallback((config) => setModal(config), []);
  const closeModal = useCallback(() => setModal(null), []);
  const showBanner = useCallback((config) => setBanner(config), []);
  const closeBanner = useCallback(() => setBanner(null), []);

  return (
    <NotificationContext.Provider value={{ 
      addToast, removeToast, showModal, closeModal, showBanner, closeBanner,
      toastPosition, setToastPosition, toasts, modal, banner
    }}>
      {children}
      <ToastContainer />
      <ModalContainer />
      <BannerContainer />
    </NotificationContext.Provider>
  );
};

// ===== TOAST CONTAINER =====
const ToastContainer = () => {
  const { toasts, removeToast, toastPosition } = useNotification();
  
  const positionStyles = {
    'top-left': { top: '100px', left: '24px' },
    'top-right': { top: '100px', right: '24px' },
    'top-center': { top: '100px', left: '50%', transform: 'translateX(-50%)' },
    'bottom-left': { bottom: '24px', left: '24px' },
    'bottom-right': { bottom: '24px', right: '24px' },
    'bottom-center': { bottom: '24px', left: '50%', transform: 'translateX(-50%)' },
  };

  // Fix #9: Animation based on position
  const getAnimation = () => {
    if (toastPosition.includes('center')) return 'slideInDown';
    if (toastPosition.includes('right')) return 'slideInRight';
    if (toastPosition.includes('left')) return 'slideInLeft';
    return 'slideInDown';
  };

  const typeStyles = {
    success: { icon: CheckCircle, color: 'var(--accent)', bg: 'var(--successBg)' },
    error: { icon: XCircle, color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.15)' },
    warning: { icon: AlertTriangle, color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.15)' },
    info: { icon: Info, color: 'var(--info)', bg: 'rgba(59, 130, 246, 0.15)' },
  };

  return (
    <div style={{
      position: 'fixed',
      ...positionStyles[toastPosition],
      zIndex: 2000,
      display: 'flex',
      flexDirection: toastPosition.includes('bottom') ? 'column-reverse' : 'column',
      gap: '12px',
      maxWidth: '380px',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const type = typeStyles[toast.type] || typeStyles.info;
        const IconComp = type.icon;
        return (
          <div
            key={toast.id}
            role="alert"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              background: 'var(--surfaceSolid)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: `4px solid ${type.color}`,
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              animation: `${getAnimation()} 0.3s ease`,
              pointerEvents: 'auto',
            }}
          >
            <IconComp size={20} color={type.color} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', color: 'var(--textMuted)', lineHeight: 1.4 }}>
                {toast.message}
              </div>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="hover-bright"
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: type.color,
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'filter 0.2s',
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="通知を閉じる"
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                opacity: 0.6,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              <X size={16} color="var(--textMuted)" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ===== MODAL CONTAINER =====
const ModalContainer = () => {
  const { modal, closeModal } = useNotification();
  const { breakpoint } = useBreakpoint();
  
  if (!modal) return null;

  const typeStyles = {
    success: { icon: CheckCircle, color: 'var(--accent)' },
    error: { icon: XCircle, color: 'var(--danger)' },
    warning: { icon: AlertTriangle, color: 'var(--warning)' },
    info: { icon: Info, color: 'var(--info)' },
    confirm: { icon: AlertCircle, color: 'var(--accent)' },
  };

  const type = typeStyles[modal.type] || typeStyles.info;
  const IconComp = type.icon;

  return (
    <>
      <div 
        onClick={() => modal.dismissible !== false && closeModal()}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 2100,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      {/* Fix #11: Responsive modal */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '420px',
          background: 'var(--surfaceSolid)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: breakpoint === 'sm' ? '20px' : '28px',
          zIndex: 2101,
          animation: 'modalIn 0.3s ease',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            background: `${type.color}20`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <IconComp size={28} color={type.color} />
          </div>
          <h2 id="modal-title" style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>
            {modal.title}
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--textMuted)', lineHeight: 1.5 }}>
            {modal.message}
          </p>
        </div>
        
        {modal.content && <div style={{ marginBottom: '20px' }}>{modal.content}</div>}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {modal.cancelLabel && (
            <button
              onClick={() => { modal.onCancel?.(); closeModal(); }}
              className="hover-bg"
              style={{
                flex: 1,
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                color: 'var(--text)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {modal.cancelLabel}
            </button>
          )}
          <button
            onClick={() => { modal.onConfirm?.(); closeModal(); }}
            className="hover-bright"
            style={{
              flex: 1,
              padding: '12px 20px',
              background: type.color,
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'filter 0.2s',
            }}
          >
            {modal.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </>
  );
};

// ===== BANNER CONTAINER =====
const BannerContainer = () => {
  const { banner, closeBanner } = useNotification();
  const { breakpoint } = useBreakpoint();
  
  if (!banner) return null;

  const typeStyles = {
    success: { icon: CheckCircle, color: 'var(--accent)', bg: 'var(--successBg)' },
    error: { icon: XCircle, color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.15)' },
    warning: { icon: AlertTriangle, color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.15)' },
    info: { icon: Info, color: 'var(--info)', bg: 'rgba(59, 130, 246, 0.15)' },
  };

  const type = typeStyles[banner.type] || typeStyles.info;
  const IconComp = type.icon;

  // Fix #12: Responsive banner padding
  return (
    <div 
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: type.bg,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${type.color}40`,
        padding: breakpoint === 'sm' ? '10px 16px' : '12px 24px',
        zIndex: 1900,
        animation: 'bannerIn 0.3s ease',
      }}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <IconComp size={20} color={type.color} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: breakpoint === 'sm' ? '0.8rem' : '0.9rem', color: 'var(--text)' }}>
          {banner.title && <strong style={{ marginRight: '8px' }}>{banner.title}</strong>}
          {banner.message}
        </div>
        {banner.action && (
          <button
            onClick={banner.action.onClick}
            className="hover-bright"
            style={{
              padding: '6px 14px',
              background: type.color,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'filter 0.2s',
            }}
          >
            {banner.action.label}
          </button>
        )}
        {banner.dismissible !== false && (
          <button
            onClick={closeBanner}
            aria-label="バナーを閉じる"
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
          >
            <X size={18} color="var(--textMuted)" />
          </button>
        )}
      </div>
    </div>
  );
};

// ===== HOOKS =====
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('lg');
  const [columns, setColumns] = useState(12);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) { setBreakpoint('sm'); setColumns(4); }
      else if (w < 1024) { setBreakpoint('md'); setColumns(8); }
      else { setBreakpoint('lg'); setColumns(12); }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return { breakpoint, columns };
};

const useTabTitle = (enabled = true) => {
  useEffect(() => {
    if (!enabled) {
      document.title = 'Widget Dashboard';
      return;
    }
    const update = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const date = now.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
      document.title = `${time} | ${date}`;
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [enabled]);
};

// ===== SHARED COMPONENTS =====
const Icon = ({ icon: IconComponent, size = 18, color = 'currentColor', style = {} }) => (
  <IconComponent size={size} color={color} strokeWidth={1.5} style={{ flexShrink: 0, ...style }} />
);

const Favicon = ({ url, size = 20, grayscale = false }) => {
  const [error, setError] = useState(false);
  const domain = useMemo(() => { try { return new URL(url).hostname; } catch { return ''; } }, [url]);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  if (error || !domain) return <Icon icon={Globe} size={size} color="var(--accent)" />;
  return <img src={faviconUrl} alt="" width={size} height={size} onError={() => setError(true)} style={{ borderRadius: '4px', filter: grayscale ? 'grayscale(100%) brightness(1.2)' : 'none' }} />;
};

// Fix #8: Unified Widget Header Component
const WidgetHeader = ({ icon, title, subtitle, badge, actions }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '10px' }}>
    <div style={{ minWidth: 0 }}>
      <h3 style={{ margin: 0, fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <Icon icon={icon} size={18} color="var(--accent)" />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {badge && (
          <span style={{ padding: '4px 10px', background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '999px', fontSize: '0.72rem', color: 'var(--textMuted)', flexShrink: 0 }}>
            {badge}
          </span>
        )}
      </h3>
      {subtitle && (
        <div style={{ marginTop: '6px', fontSize: '0.78rem', lineHeight: 1.35, color: 'var(--textMuted)' }}>
          {subtitle}
        </div>
      )}
    </div>
    {actions && <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>{actions}</div>}
  </div>
);

// Fix #4: Clickable Progress Bar Component
const ProgressBar = ({ value, max = 100, onChange, height = 4, showHandle = false }) => {
  const barRef = useRef(null);
  
  const handleClick = (e) => {
    if (!onChange || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onChange(percentage);
  };

  return (
    <div 
      ref={barRef}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!onChange) return;
        if (e.key === 'ArrowRight') onChange(Math.min(100, value + 5));
        if (e.key === 'ArrowLeft') onChange(Math.max(0, value - 5));
      }}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      tabIndex={onChange ? 0 : -1}
      style={{ 
        height: `${height}px`, 
        background: 'rgba(255, 255, 255, 0.1)', 
        borderRadius: `${height / 2}px`, 
        overflow: 'visible',
        cursor: onChange ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <div style={{ 
        width: `${(value / max) * 100}%`, 
        height: '100%', 
        background: 'var(--accent)', 
        borderRadius: `${height / 2}px`,
        transition: 'width 0.1s',
        position: 'relative',
      }}>
        {showHandle && (
          <div style={{
            position: 'absolute',
            right: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '12px',
            height: '12px',
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }} />
        )}
      </div>
    </div>
  );
};

const ThemedCheckbox = ({ checked, onChange, size = 20 }) => (
  <div 
    onClick={onChange} 
    onKeyDown={(e) => e.key === 'Enter' && onChange?.()}
    role="checkbox"
    aria-checked={checked}
    tabIndex={0}
    style={{ width: `${size}px`, height: `${size}px`, borderRadius: '6px', border: `2px solid ${checked ? 'var(--accent)' : 'rgba(255, 255, 255, 0.3)'}`, background: checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
  >
    {checked && <Icon icon={Check} size={size * 0.6} color="white" />}
  </div>
);

// ===== GLASSMORPHISM BASE =====
const GlassCard = ({ children, style = {}, isEditing = false, isSelected = false, onSelect, widgetId, onOpenSettings, onToggleVisibility, onDelete, isVisible = true }) => (
  <div 
    style={{
      position: 'relative', background: 'var(--surface)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: '20px',
      border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: isSelected ? `0 0 0 4px var(--glow), 0 8px 32px var(--shadow)` : `0 8px 32px var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      transition: 'all 0.3s', opacity: isVisible ? 1 : 0.5, overflow: 'hidden', minWidth: 0, ...style
    }}
    onClick={() => isEditing && onSelect?.(widgetId)}
  >
    {children}
    {isEditing && (
      <>
        <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', padding: '4px 12px', background: 'rgba(0, 0, 0, 0.6)', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}><Icon icon={GripVertical} size={14} color="var(--textMuted)" /></div>
        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
          <button onClick={(e) => { e.stopPropagation(); onOpenSettings?.(widgetId); }} aria-label="ウィジェット設定" className="hover-bg" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.6)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}><Icon icon={Settings} size={16} color="var(--textMuted)" /></button>
          <button onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(widgetId); }} aria-label="表示切替" className="hover-bg" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.6)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}><Icon icon={isVisible ? Eye : EyeOff} size={16} color={isVisible ? 'var(--textMuted)' : 'var(--warning)'} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(widgetId); }} aria-label="削除" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.3)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}><Icon icon={Trash2} size={16} color="#fca5a5" /></button>
        </div>
        <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '20px', height: '20px', cursor: 'se-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon={Maximize2} size={12} color="var(--textSubtle)" /></div>
      </>
    )}
  </div>
);

// ===== NOTIFICATION TEST WIDGET =====
const NotificationTestWidget = (props) => {
  const { addToast, showModal, showBanner, toastPosition, setToastPosition } = useNotification();
  const { breakpoint } = useBreakpoint();
  const [toastType, setToastType] = useState('success');
  const [toastTitle, setToastTitle] = useState('成功しました');
  const [toastMessage, setToastMessage] = useState('操作が正常に完了しました。');

  const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
  const positionLabels = { 'top-left': '左上', 'top-center': '中上', 'top-right': '右上', 'bottom-left': '左下', 'bottom-center': '中下', 'bottom-right': '右下' };

  return (
    <GlassCard {...props} style={{ padding: 'clamp(14px, 2.5vw, 20px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WidgetHeader icon={Bell} title="通知テスト" subtitle="UI Test: Toast / Modal / Banner（種類・位置の挙動確認）" badge="UI Test" />

      {/* Fix #10: Better position selector */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--textMuted)', marginBottom: '6px', display: 'block' }}>トースト位置</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setToastPosition(pos)}
              className="hover-bg"
              style={{
                padding: '8px 6px',
                background: toastPosition === pos ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {positionLabels[pos]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--textMuted)', marginBottom: '6px', display: 'block' }}>タイプ</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['success', 'error', 'warning', 'info'].map(t => (
            <button
              key={t}
              onClick={() => setToastType(t)}
              className="hover-bg"
              style={{
                flex: 1,
                padding: '8px',
                background: toastType === t ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {t === 'success' ? '成功' : t === 'error' ? 'エラー' : t === 'warning' ? '警告' : '情報'}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={toastTitle}
        onChange={(e) => setToastTitle(e.target.value)}
        placeholder="タイトル"
        aria-label="タイトル"
        style={{ marginBottom: '8px', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none' }}
      />
      <input
        type="text"
        value={toastMessage}
        onChange={(e) => setToastMessage(e.target.value)}
        placeholder="メッセージ"
        aria-label="メッセージ"
        style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
        <button
          onClick={() => addToast({ type: toastType, title: toastTitle, message: toastMessage })}
          className="hover-bright"
          style={{ padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'filter 0.2s' }}
        >
          <Icon icon={Bell} size={16} /> トースト表示
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => showModal({
              type: toastType,
              title: toastTitle,
              message: toastMessage,
              confirmLabel: '確認',
              cancelLabel: 'キャンセル',
              onConfirm: () => addToast({ type: 'success', message: 'モーダルで確認しました' }),
            })}
            className="hover-bg"
            style={{ flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '10px', color: 'var(--text)', fontSize: '0.8rem', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            モーダル
          </button>
          <button
            onClick={() => showBanner({
              type: toastType,
              title: toastTitle,
              message: toastMessage,
              action: { label: 'アクション', onClick: () => addToast({ type: 'info', message: 'バナーアクション実行' }) },
            })}
            className="hover-bg"
            style={{ flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '10px', color: 'var(--text)', fontSize: '0.8rem', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            バナー
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

// ===== MUSIC PLAYER WIDGET =====
const MusicPlayerWidget = (props) => {
  const { breakpoint } = useBreakpoint();
  const { isEditing } = props;
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const currentTrack = { title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', duration: 243, cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80' };
  const playlist = [
    { title: 'Midnight City', artist: 'M83', duration: 243 },
    { title: 'Blinding Lights', artist: 'The Weeknd', duration: 200 },
    { title: 'Starboy', artist: 'The Weeknd', duration: 230 },
    { title: 'Levitating', artist: 'Dua Lipa', duration: 203 },
  ];

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const currentTime = Math.floor((progress / 100) * currentTrack.duration);

  return (
    <GlassCard {...props} style={{ position: 'relative', pointerEvents: isEditing ? 'none' : 'auto', padding: 'clamp(14px, 2.5vw, 20px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WidgetHeader 
        icon={Music} 
        title={breakpoint !== 'sm' ? 'Music' : ''} 
        subtitle=\"UI Test: Music Player（再生・シーク・音量・キューUIの検証）\" 
        badge=\"UI Test\" 
        actions={
          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            aria-label="プレイリスト表示"
            className="hover-bg"
            style={{ padding: '6px', background: showPlaylist ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            <Icon icon={ListMusic} size={16} color="var(--text)" />
          </button>
        }
      />
      {isEditing && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 10px', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '999px', fontSize: '0.72rem', color: 'var(--text)' }}>
          編集モード中は操作無効
        </div>
      )}

      {!showPlaylist ? (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: breakpoint === 'sm' ? '60px' : '80px',
              height: breakpoint === 'sm' ? '60px' : '80px',
              borderRadius: '12px',
              background: `url(${currentTrack.cover}) center/cover`,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.title}</div>
              <div style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)', color: 'var(--textMuted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist}</div>
              <div style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)', color: 'var(--textSubtle)', marginTop: '2px' }}>{currentTrack.album}</div>
            </div>
          </div>

          {/* Fix #4: Clickable progress bar */}
          <div style={{ marginBottom: '12px' }}>
            <ProgressBar value={progress} onChange={setProgress} showHandle />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--textMuted)', fontFamily: "'JetBrains Mono', monospace" }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(currentTrack.duration)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: breakpoint === 'sm' ? '8px' : '16px', marginBottom: '12px' }}>
            <button onClick={() => setIsShuffled(!isShuffled)} aria-label="シャッフル" className="hover-bg" style={{ padding: '8px', background: isShuffled ? 'var(--successBg)' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}>
              <Icon icon={ShuffleIcon} size={16} color={isShuffled ? 'var(--accent)' : 'var(--textMuted)'} />
            </button>
            <button aria-label="前の曲" className="hover-bg" style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <Icon icon={SkipBack} size={20} color="var(--text)" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? '一時停止' : '再生'}
              className="hover-glow"
              style={{
                width: '48px', height: '48px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px var(--glow)',
                transition: 'box-shadow 0.2s',
              }}
            >
              <Icon icon={isPlaying ? Pause : Play} size={24} color="white" style={{ marginLeft: isPlaying ? 0 : '2px' }} />
            </button>
            <button aria-label="次の曲" className="hover-bg" style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <Icon icon={SkipForward} size={20} color="var(--text)" />
            </button>
            <button onClick={() => setIsRepeating(!isRepeating)} aria-label="リピート" className="hover-bg" style={{ padding: '8px', background: isRepeating ? 'var(--successBg)' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}>
              <Icon icon={Repeat} size={16} color={isRepeating ? 'var(--accent)' : 'var(--textMuted)'} />
            </button>
          </div>

          {/* Fix #4: Clickable volume bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? 'ミュート解除' : 'ミュート'} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Icon icon={isMuted ? VolumeX : Volume2} size={16} color="var(--textMuted)" />
            </button>
            <div style={{ flex: 1 }}>
              <ProgressBar value={isMuted ? 0 : volume} onChange={(v) => { setVolume(v); setIsMuted(false); }} />
            </div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {playlist.map((track, i) => (
            <div 
              key={i} 
              className="hover-bg"
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', background: i === 0 ? 'var(--successBg)' : 'transparent', marginBottom: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i === 0 ? <Icon icon={isPlaying ? Pause : Play} size={14} color="var(--accent)" /> : <span style={{ fontSize: '0.8rem', color: 'var(--textMuted)' }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', color: i === 0 ? 'var(--accent)' : 'var(--text)', fontWeight: i === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--textMuted)' }}>{track.artist}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--textMuted)', fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(track.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

// ===== VIDEO PLAYER WIDGET =====
const VideoPlayerWidget = (props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(25);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(80);
  const totalDuration = 330;
  const currentTime = Math.floor((progress / 100) * totalDuration);

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <GlassCard {...props} style={{ position: 'relative', pointerEvents: isEditing ? 'none' : 'auto', padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div 
        style={{ flex: 1, position: 'relative', background: '#000', minHeight: '120px' }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'url(https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80) center/cover',
          opacity: isPlaying ? 0.3 : 0.8,
          transition: 'opacity 0.3s',
        }} />

        {!isPlaying && (
          <button
            onClick={() => setIsPlaying(true)}
            aria-label="再生"
            className="hover-scale"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '64px',
              height: '64px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              transition: 'transform 0.2s',
            }}
          >
            <Icon icon={Play} size={28} color="white" style={{ marginLeft: '4px' }} />
          </button>
        )}

        {showControls && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px',
            background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
          }}>
            {/* Fix #4: Clickable progress */}
            <ProgressBar value={progress} onChange={setProgress} showHandle />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? '一時停止' : '再生'} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Icon icon={isPlaying ? Pause : Play} size={20} color="white" />
                </button>
                <button aria-label="音量" style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Icon icon={Volume2} size={18} color="white" />
                </button>
                <span style={{ fontSize: '0.75rem', color: 'white', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>
              <button onClick={() => setIsFullscreen(!isFullscreen)} aria-label="フルスクリーン" style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <Icon icon={isFullscreen ? Minimize : Maximize} size={18} color="white" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon icon={Video} size={14} color="var(--accent)" />
          Big Buck Bunny - Trailer
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--textMuted)' }}>Blender Foundation • 1.2M views</div>
      </div>
    </GlassCard>
  );
};

// ===== FEED TICKER WIDGET =====
const FeedTickerWidget = (props) => {
  const { breakpoint } = useBreakpoint();
  const [isPaused, setIsPaused] = useState(false);

  const feeds = [
    { source: 'Tech News', title: 'Apple announces new M4 chip with unprecedented AI capabilities', time: '2分前' },
    { source: 'Dev Weekly', title: 'React 19 brings exciting new features for concurrent rendering', time: '15分前' },
    { source: 'Hacker News', title: 'PostgreSQL 17 released with major performance improvements', time: '32分前' },
    { source: 'GitHub', title: 'Trending: A new open-source AI coding assistant reaches 50k stars', time: '1時間前' },
    { source: 'Product Hunt', title: 'Today\'s #1 Product: Revolutionary note-taking app with AI', time: '2時間前' },
  ];

  return (
    <GlassCard {...props} style={{ padding: 'clamp(12px, 2vw, 16px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WidgetHeader 
        icon={Rss} 
        title="フィード"
        actions={
          <button
            onClick={() => setIsPaused(!isPaused)}
            aria-label={isPaused ? '再開' : '一時停止'}
            className="hover-bg"
            style={{ padding: '6px 10px', background: isPaused ? 'var(--warning)' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}
          >
            <Icon icon={isPaused ? Play : Pause} size={12} color={isPaused ? 'white' : 'var(--textMuted)'} />
          </button>
        }
      />

      <div style={{ 
        flex: 1, 
        overflow: 'hidden', 
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '10px',
        padding: '8px 12px',
      }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: isPaused ? 'none' : 'tickerScroll 40s linear infinite',
          }}
        >
          {[...feeds, ...feeds].map((feed, i) => (
            <a 
              key={i}
              href="#"
              className="hover-bg"
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '10px',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                textDecoration: 'none',
              }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div style={{
                padding: '3px 8px',
                background: 'var(--accent)',
                borderRadius: '4px',
                fontSize: '0.6rem',
                fontWeight: 600,
                color: 'white',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {feed.source}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)', color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {feed.title}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--textSubtle)', marginTop: '4px' }}>{feed.time}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

// ===== Fix #5: FLOW TIME WIDGET (Restored from v4) =====
const FlowTimeWidget = (props) => {
  const { breakpoint } = useBreakpoint();
  const [isRunning, setIsRunning] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [taskHistory, setTaskHistory] = useState(['コーディング', 'ドキュメント作成', 'コードレビュー', 'デザイン作業']);
  const [sessions, setSessions] = useState([
    { task: 'コーディング', duration: 45, reason: 'complete', date: new Date().toISOString() },
  ]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - startTime) / 1000)), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!taskName.trim()) return;
    setIsRunning(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    if (!taskHistory.includes(taskName)) {
      setTaskHistory(prev => [taskName, ...prev].slice(0, 10));
    }
    setShowSuggestions(false);
  };

  const handleStop = (reason) => {
    const duration = Math.floor(elapsedTime / 60);
    setSessions(prev => [...prev, { task: taskName, duration, reason, date: new Date().toISOString() }]);
    setIsRunning(false);
    setElapsedTime(0);
    setTaskName('');
    setStartTime(null);
  };

  const filteredSuggestions = taskHistory.filter(t => t.toLowerCase().includes(taskName.toLowerCase()) && t !== taskName);
  const todayTotal = sessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <GlassCard {...props} style={{ padding: 'clamp(14px, 2.5vw, 20px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <WidgetHeader icon={Timer} title="フロータイム" />
        <div style={{ fontSize: '0.75rem', color: 'var(--textMuted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Icon icon={TrendingUp} size={12} />
          本日: {todayTotal}分
        </div>
      </div>

      {!isRunning ? (
        <>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="タスク名を入力..."
              aria-label="タスク名"
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--surfaceSolid)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', overflow: 'hidden', zIndex: 10 }}>
                {filteredSuggestions.map((suggestion, i) => (
                  <button key={i} onClick={() => { setTaskName(suggestion); setShowSuggestions(false); }} className="hover-bg" style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: i < filteredSuggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none', color: 'var(--text)', fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s' }}>{suggestion}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleStart} disabled={!taskName.trim()} className={taskName.trim() ? 'hover-bright' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: taskName.trim() ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '12px', color: taskName.trim() ? 'white' : 'var(--textMuted)', fontSize: '0.95rem', fontWeight: 600, cursor: taskName.trim() ? 'pointer' : 'not-allowed', boxShadow: taskName.trim() ? '0 4px 15px var(--glow)' : 'none', transition: 'filter 0.2s' }}>
            <Icon icon={Play} size={20} /> スタート
          </button>
        </>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--textMuted)', marginBottom: '4px' }}>{taskName}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 300, color: 'var(--text)', textShadow: '0 0 20px var(--glow)' }}>{formatTime(elapsedTime)}</div>
            <div style={{ marginTop: '8px' }}><ProgressBar value={(elapsedTime % 60) / 60 * 100} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: breakpoint === 'sm' ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: '6px' }}>
            {STOP_REASONS.slice(0, breakpoint === 'sm' ? 3 : 5).map(reason => (
              <button key={reason.id} onClick={() => handleStop(reason.id)} className="hover-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 6px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: 'var(--text)', fontSize: '0.7rem', cursor: 'pointer', transition: 'background 0.2s' }}>
                <Icon icon={reason.icon} size={18} color={reason.color} />
                {reason.label}
              </button>
            ))}
          </div>
        </>
      )}

      {sessions.length > 0 && !isRunning && (
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--textMuted)', marginBottom: '8px' }}>最近のセッション</div>
          {sessions.slice(-2).reverse().map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '0.8rem' }}>
              <Icon icon={STOP_REASONS.find(r => r.id === s.reason)?.icon || Check} size={14} color={STOP_REASONS.find(r => r.id === s.reason)?.color} />
              <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.task}</span>
              <span style={{ color: 'var(--textMuted)' }}>{s.duration}分</span>
            </div>
          ))}
        </div>
      )}
    
      <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--textMuted)', opacity: 0.9 }}>
        Sample Data
      </div>
</GlassCard>
  );
};

// ===== Fix #5: STATS WIDGET (Restored from v4) =====
const StatsWidget = (props) => {
  const { breakpoint } = useBreakpoint();
  const [activeTab, setActiveTab] = useState('flowtime');
  const [chartType, setChartType] = useState('bar');

  const flowtimeData = [
    { day: '月', time: 180 }, { day: '火', time: 240 }, { day: '水', time: 120 },
    { day: '木', time: 300 }, { day: '金', time: 210 }, { day: '土', time: 90 }, { day: '日', time: 60 },
  ];

  const todoData = [
    { day: '月', completed: 5, total: 8 }, { day: '火', completed: 7, total: 9 }, { day: '水', completed: 3, total: 6 },
    { day: '木', completed: 8, total: 10 }, { day: '金', completed: 6, total: 7 }, { day: '土', completed: 2, total: 3 }, { day: '日', completed: 1, total: 2 },
  ];

  const habitData = [
    { name: '運動', rate: 85 }, { name: '読書', rate: 92 }, { name: '瞑想', rate: 60 }, { name: '水2L', rate: 45 },
  ];

  const COLORS = ['var(--accent)', 'var(--info)', 'var(--warning)', 'var(--danger)'];
  const tabs = [{ id: 'flowtime', label: 'フロータイム', icon: Timer }, { id: 'todo', label: 'TODO', icon: CheckSquare }, { id: 'habit', label: '習慣', icon: Target }];

  const renderChart = () => {
    if (activeTab === 'flowtime') {
      return chartType === 'bar' ? (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={flowtimeData}>
            <XAxis dataKey="day" tick={{ fill: 'var(--textMuted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surfaceSolid)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'var(--text)' }} formatter={(v) => [`${v}分`, '時間']} />
            <Bar dataKey="time" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={flowtimeData}>
            <XAxis dataKey="day" tick={{ fill: 'var(--textMuted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surfaceSolid)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'var(--text)' }} formatter={(v) => [`${v}分`, '時間']} />
            <Line type="monotone" dataKey="time" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (activeTab === 'todo') {
      return chartType === 'bar' ? (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={todoData}>
            <XAxis dataKey="day" tick={{ fill: 'var(--textMuted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surfaceSolid)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'var(--text)' }} />
            <Bar dataKey="completed" fill="var(--accent)" radius={[4, 4, 0, 0]} name="完了" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={todoData}>
            <XAxis dataKey="day" tick={{ fill: 'var(--textMuted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surfaceSolid)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="completed" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} name="完了" />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    return (
      <div style={{ display: 'flex', gap: '8px', height: '120px', alignItems: 'flex-end' }}>
        {habitData.map((h, i) => (
          <div key={h.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '100%', height: `${h.rate}%`, background: COLORS[i], borderRadius: '4px 4px 0 0', minHeight: '20px' }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--textMuted)' }}>{h.name}</span>
          </div>
        ))}
      </div>
    );
  };

  const getSummary = () => {
    if (activeTab === 'flowtime') {
      const total = flowtimeData.reduce((acc, d) => acc + d.time, 0);
      return { label: '今週合計', value: `${Math.round(total / 60)}時間`, sub: `平均 ${Math.round(total / 7)}分/日` };
    }
    if (activeTab === 'todo') {
      const completed = todoData.reduce((acc, d) => acc + d.completed, 0);
      const total = todoData.reduce((acc, d) => acc + d.total, 0);
      return { label: '完了率', value: `${Math.round(completed / total * 100)}%`, sub: `${completed}/${total} タスク` };
    }
    const avgRate = Math.round(habitData.reduce((acc, h) => acc + h.rate, 0) / habitData.length);
    return { label: '達成率', value: `${avgRate}%`, sub: `${habitData.length}つの習慣` };
  };

  const summary = getSummary();

  return (
    <GlassCard {...props} style={{ padding: 'clamp(14px, 2.5vw, 20px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WidgetHeader 
        icon={BarChart3} 
        title="統計"
        actions={
          <>
            <button onClick={() => setChartType('bar')} aria-label="棒グラフ" className="hover-bg" style={{ padding: '6px', background: chartType === 'bar' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}><Icon icon={BarChart3} size={14} color="var(--text)" /></button>
            <button onClick={() => setChartType('line')} aria-label="折れ線グラフ" className="hover-bg" style={{ padding: '6px', background: chartType === 'line' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}><Icon icon={TrendingUp} size={14} color="var(--text)" /></button>
          </>
        }
      />

      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="hover-bg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px 6px', background: activeTab === tab.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '8px', color: 'var(--text)', fontSize: 'clamp(0.65rem, 1.3vw, 0.75rem)', cursor: 'pointer', transition: 'background 0.2s' }}>
            <Icon icon={tab.icon} size={14} />
            {breakpoint !== 'sm' && tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--textMuted)' }}>{summary.label}</div>
          <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 600, color: 'var(--text)' }}>{summary.value}</div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--textMuted)' }}>{summary.sub}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>{renderChart()}</div>
    
      <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--textMuted)', opacity: 0.9 }}>
        Sample Data
      </div>
</GlassCard>
  );
};

// ===== SIMPLIFIED WIDGETS =====
const ClockWidget = (props) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <GlassCard {...props} style={{ padding: 'clamp(12px, 3vw, 24px)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <Icon icon={Clock} size={16} color="var(--textMuted)" style={{ marginBottom: '8px' }} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(1.5rem, 5vw, 3.5rem)', fontWeight: 200, color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {time.getHours().toString().padStart(2, '0')}:{time.getMinutes().toString().padStart(2, '0')}
        <span style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1.8rem)', color: 'var(--textMuted)', marginLeft: '8px' }}>{time.getSeconds().toString().padStart(2, '0')}</span>
      </div>
      <div style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.9rem)', color: 'var(--textMuted)', marginTop: '8px', textAlign: 'center' }}>
        {time.toLocaleDateString('ja-JP', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </GlassCard>
  );
};

const SearchWidget = (props) => {
  const [query, setQuery] = useState('');
  const { breakpoint } = useBreakpoint();
  return (
    <GlassCard {...props} style={{ padding: 'clamp(12px, 2vw, 16px)', height: '100%', display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 12px)' }}>
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <Icon icon={Search} size={18} color="var(--textMuted)" style={{ position: 'absolute', left: '14px' }} />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="検索..." aria-label="検索" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '12px 18px 12px 44px', color: 'var(--text)', fontSize: '1rem', outline: 'none', minWidth: 0 }} onKeyDown={(e) => { if (e.key === 'Enter' && query) window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, '_blank'); }} />
      </div>
      <button onClick={() => query && window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, '_blank')} aria-label="検索実行" className="hover-bright" style={{ background: 'var(--accent)', border: 'none', borderRadius: '12px', padding: breakpoint === 'sm' ? '12px' : '12px 20px', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, transition: 'filter 0.2s' }}>
        <Icon icon={Search} size={16} />{breakpoint !== 'sm' && '検索'}
      </button>
    </GlassCard>
  );
};

const TodoWidget = (props) => {
  const [todos, setTodos] = useState([{ id: 1, text: 'ダッシュボードのデザイン', done: true }, { id: 2, text: 'ウィジェット実装', done: false }]);
  const [newTodo, setNewTodo] = useState('');
  return (
    <GlassCard {...props} style={{ padding: 'clamp(14px, 2.5vw, 20px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WidgetHeader icon={CheckSquare} title="TODO" />
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', minHeight: 0 }}>
        {todos.map(todo => (
          <div key={todo.id} onClick={() => setTodos(todos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))} className="hover-bg" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', marginBottom: '8px', background: todo.done ? 'var(--successBg)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s' }}>
            <ThemedCheckbox checked={todo.done} onChange={() => {}} />
            <span style={{ color: todo.done ? 'var(--textMuted)' : 'var(--text)', textDecoration: todo.done ? 'line-through' : 'none', fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)' }}>{todo.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="新しいタスク..." aria-label="新しいタスク" onKeyDown={(e) => { if (e.key === 'Enter' && newTodo.trim()) { setTodos([...todos, { id: Date.now(), text: newTodo, done: false }]); setNewTodo(''); }}} style={{ flex: 1, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', minWidth: 0 }} />
        <button onClick={() => { if (newTodo.trim()) { setTodos([...todos, { id: Date.now(), text: newTodo, done: false }]); setNewTodo(''); }}} aria-label="タスク追加" className="hover-bright" style={{ background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '10px 16px', color: 'white', cursor: 'pointer', transition: 'filter 0.2s' }}><Icon icon={Plus} size={18} /></button>
      </div>
    </GlassCard>
  );
};

const WeatherWidget = (props) => {
  const { breakpoint } = useBreakpoint();
  return (
    <GlassCard {...props} style={{ padding: 'clamp(14px, 2.5vw, 20px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div><div style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 200, color: 'var(--text)', lineHeight: 1 }}>18°</div><div style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)', color: 'var(--textMuted)', marginTop: '4px' }}>H:22° L:14°</div></div>
        <div style={{ textAlign: 'right' }}><Sun size={breakpoint === 'sm' ? 36 : 48} color="var(--warning)" strokeWidth={1.5} /><div style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)', color: 'var(--textMuted)', marginTop: '4px' }}>晴れ</div></div>
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)', color: 'var(--textMuted)' }}><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icon icon={Droplets} size={14} /> 65%</span><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icon icon={Wind} size={14} /> 12km/h</span></div>
    </GlassCard>
  );
};

const QuickLinksWidget = (props) => {
  const [grayscale, setGrayscale] = useState(false);
  const links = [{ name: 'GitHub', url: 'https://github.com' }, { name: 'Gmail', url: 'https://mail.google.com' }, { name: 'YouTube', url: 'https://youtube.com' }, { name: 'Twitter', url: 'https://twitter.com' }];
  return (
    <GlassCard {...props} style={{ padding: 'clamp(12px, 2vw, 16px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WidgetHeader 
        icon={Zap} 
        title="リンク"
        actions={
          <button onClick={() => setGrayscale(!grayscale)} aria-label="カラー切替" className="hover-bg" style={{ padding: '4px', background: grayscale ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }}><Icon icon={Palette} size={12} color="var(--text)" /></button>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', flex: 1 }}>
        {links.map(link => (<a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="hover-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', textDecoration: 'none', transition: 'background 0.2s' }}><Favicon url={link.url} size={22} grayscale={grayscale} /><span style={{ fontSize: '0.7rem', color: 'var(--textMuted)' }}>{link.name}</span></a>))}
      </div>
    </GlassCard>
  );
};

// ===== Fix #16: SETTINGS SIDEBAR with content =====
const SettingsSidebar = ({ isOpen, onClose, widgetId }) => {
  const { breakpoint } = useBreakpoint();
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1000 }} />
      <div role="dialog" aria-modal="true" aria-labelledby="sidebar-title" style={{ position: 'fixed', top: 0, right: 0, width: breakpoint === 'sm' ? '100%' : '360px', height: '100vh', background: 'var(--surfaceSolid)', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 1001, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h2 id="sidebar-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon icon={Settings} size={18} color="var(--accent)" />ウィジェット設定</h2>
          <button onClick={onClose} aria-label="閉じる" className="hover-bg" style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}><Icon icon={X} size={18} color="var(--textMuted)" /></button>
        </div>
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--textMuted)', marginBottom: '8px' }}>表示形式</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="hover-bg" style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}>24時間</button>
              <button className="hover-bg" style={{ flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}>12時間</button>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>秒を表示</span>
              <div style={{ width: '44px', height: '24px', background: 'var(--accent)', borderRadius: '12px', position: 'relative' }}><div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', right: '3px' }} /></div>
            </label>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--textMuted)', marginBottom: '8px' }}>更新間隔</label>
            <select style={{ width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none' }}>
              <option value="1">1秒</option>
              <option value="5">5秒</option>
              <option value="60">1分</option>
            </select>
          </div>
        </div>
        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '12px' }}>
          <button onClick={onClose} className="hover-bg" style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '10px', color: 'var(--text)', cursor: 'pointer', transition: 'background 0.2s' }}>キャンセル</button>
          <button onClick={onClose} className="hover-bright" style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'filter 0.2s' }}>保存</button>
        </div>
      </div>
    </>
  );
};

// ===== Fix #2 & #17: GLOBAL SETTINGS PANEL with overlay =====
const GlobalSettingsPanel = ({ isOpen, onClose, theme, setTheme, customAccent, setCustomAccent, enableTabTitle, setEnableTabTitle, backgroundType, setBackgroundType, backgroundImage, setBackgroundImage }) => {
  const { breakpoint } = useBreakpoint();
  if (!isOpen) return null;
  return (
    <>
      {/* Fix #2: Click outside to close */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
      <div style={{ position: 'fixed', top: breakpoint === 'sm' ? '60px' : '80px', right: breakpoint === 'sm' ? '12px' : '24px', width: breakpoint === 'sm' ? 'calc(100% - 24px)' : '340px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', padding: '20px', background: 'var(--surfaceSolid)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 1000, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon icon={Settings} size={18} color="var(--accent)" />グローバル設定</h3><button onClick={onClose} aria-label="閉じる" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon icon={X} size={18} color="var(--textMuted)" /></button></div>
        
        <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--textMuted)', marginBottom: '10px' }}>テーマ</label><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>{Object.keys(themes).map(t => (<button key={t} onClick={() => { setTheme(t); setCustomAccent(themes[t].accent); }} className="hover-scale" style={{ padding: '10px 8px', background: theme === t ? themes[t].accent : 'rgba(255, 255, 255, 0.1)', border: theme === t ? `2px solid ${themes[t].accentLight}` : '2px solid transparent', borderRadius: '10px', color: 'white', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'transform 0.2s' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: themes[t].accent }} />{t}</button>))}</div></div>
        
        <div style={{ marginBottom: '16px' }}><label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}><span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>タブに日時表示</span><div onClick={() => setEnableTabTitle(!enableTabTitle)} role="switch" aria-checked={enableTabTitle} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEnableTabTitle(!enableTabTitle)} style={{ width: '44px', height: '24px', background: enableTabTitle ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}><div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: enableTabTitle ? '23px' : '3px', transition: 'left 0.2s' }} /></div></label></div>

        {/* Fix #17: Background image selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--textMuted)', marginBottom: '10px' }}>背景タイプ</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ id: 'gradient', icon: Palette, label: 'グラデ' }, { id: 'image', icon: Image, label: '画像' }].map(type => (
              <button key={type.id} onClick={() => setBackgroundType(type.id)} className="hover-bg" style={{ flex: 1, padding: '10px 8px', background: backgroundType === type.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '10px', color: 'var(--text)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}><Icon icon={type.icon} size={16} />{type.label}</button>
            ))}
          </div>
        </div>

        {backgroundType === 'image' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--textMuted)', marginBottom: '10px' }}>背景画像</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {sampleBackgroundImages.map(img => (
                <button key={img.id} onClick={() => setBackgroundImage(img.url)} style={{ aspectRatio: '16/9', borderRadius: '8px', border: backgroundImage === img.url ? '2px solid var(--accent)' : '2px solid transparent', background: `url(${img.url}) center/cover`, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px', background: 'rgba(0,0,0,0.6)', fontSize: '0.6rem', color: 'white' }}>{img.name}</div></button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const BoardPageTabs = ({ pages, activePage, onChangePage, onAddPage, onDeletePage, isEditing }) => {
  const { breakpoint } = useBreakpoint();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', overflowX: 'auto', maxWidth: breakpoint === 'sm' ? '200px' : 'none' }}>
      {pages.map((page) => (<div key={page.id} onClick={() => onChangePage(page.id)} className="hover-bg" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: activePage === page.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.2s' }}><span style={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)', color: 'var(--text)', fontWeight: activePage === page.id ? 600 : 400 }}>{page.name}</span>{isEditing && pages.length > 1 && (<button onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }} aria-label="ページ削除" style={{ width: '16px', height: '16px', background: 'rgba(255, 255, 255, 0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon={X} size={10} color="var(--text)" /></button>)}</div>))}
      {isEditing && (<button onClick={onAddPage} aria-label="ページ追加" className="hover-bg" style={{ width: '28px', height: '28px', background: 'rgba(255, 255, 255, 0.08)', border: '1px dashed rgba(255, 255, 255, 0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}><Icon icon={Plus} size={14} color="var(--textMuted)" /></button>)}
    </div>
  );
};

// ===== MAIN DASHBOARD =====
export default function WidgetDashboard() {
  const { breakpoint, columns } = useBreakpoint();
  const [theme, setTheme] = useState('aurora');
  const [customAccent, setCustomAccent] = useState('#7c3aed');
  const [backgroundType, setBackgroundType] = useState('gradient');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [viewDensity, setViewDensity] = useState('demo'); // 'demo' | 'compact'
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
  const [enableTabTitle, setEnableTabTitle] = useState(true);
  const [pages, setPages] = useState([{ id: 'main', name: 'メイン' }, { id: 'work', name: 'ワーク' }]);
  const [activePage, setActivePage] = useState('main');
  const [widgets, setWidgets] = useState({ clock: { visible: true }, search: { visible: true }, todo: { visible: true }, weather: { visible: true }, quicklinks: { visible: true }, notification: { visible: true }, music: { visible: true }, video: { visible: true }, feed: { visible: true }, flowtime: { visible: true }, stats: { visible: true } });

  const { banner } = useContext(NotificationContext) || {};

  useTabTitle(enableTabTitle);

  const currentTheme = customAccent !== themes[theme].accent ? createTheme(customAccent, `${customAccent}aa`, `${customAccent}dd`) : themes[theme];
  
  // Fix #17: Background with image support
  const getBackground = () => {
    if (backgroundType === 'image' && backgroundImage) {
      return `url(${backgroundImage}) center/cover fixed`;
    }
    return defaultBackgrounds[theme];
  };
  
  const cssVars = { '--accent': currentTheme.accent, '--accentLight': currentTheme.accentLight, '--accentDark': currentTheme.accentDark, '--surface': currentTheme.surface, '--surfaceHover': currentTheme.surfaceHover, '--surfaceSolid': currentTheme.surfaceSolid, '--text': currentTheme.text, '--textMuted': currentTheme.textMuted, '--textSubtle': currentTheme.textSubtle, '--shadow': currentTheme.shadow, '--glow': currentTheme.glow, '--success': currentTheme.success, '--successBg': currentTheme.successBg, '--warning': currentTheme.warning, '--danger': currentTheme.danger, '--info': currentTheme.info };

  const handleAddPage = () => { setPages([...pages, { id: `page-${Date.now()}`, name: `ページ ${pages.length + 1}` }]); };
  const handleDeletePage = (pageId) => { if (pages.length <= 1) return; setPages(pages.filter(p => p.id !== pageId)); if (activePage === pageId) setActivePage(pages[0].id); };
  const widgetProps = { isEditing, isSelected: false, onSelect: () => {}, onOpenSettings: () => setSettingsSidebarOpen(true), onToggleVisibility: (id) => setWidgets(prev => ({ ...prev, [id]: { ...prev[id], visible: !prev[id].visible } })), onDelete: () => {} };
  const getSpan = (lg, md, sm) => breakpoint === 'sm' ? (sm || 4) : breakpoint === 'md' ? (md || Math.min(lg, 8)) : lg;

  return (
    <NotificationProvider>
      {/* Fix #3: Add margin-top when banner is shown */}
      <div style={{ minHeight: '100vh', background: getBackground(), padding: breakpoint === 'sm' ? '12px' : '24px', fontFamily: "'Noto Sans JP', 'Inter', sans-serif", ...cssVars }}>
        <GlobalStyles />

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakpoint === 'sm' ? '12px' : '24px', padding: breakpoint === 'sm' ? '10px 12px' : '12px 20px', background: 'var(--surface)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: breakpoint === 'sm' ? '10px' : '20px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: breakpoint === 'sm' ? '1rem' : '1.2rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon icon={Layers} size={breakpoint === 'sm' ? 18 : 20} color="var(--accent)" />{breakpoint !== 'sm' && 'Dashboard'}</h1>
            <BoardPageTabs pages={pages} activePage={activePage} onChangePage={setActivePage} onAddPage={handleAddPage} onDeletePage={handleDeletePage} isEditing={isEditing} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isEditing && breakpoint !== 'sm' && (<span style={{ padding: '6px 12px', background: 'var(--accent)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'white', animation: 'pulse 2s infinite', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon icon={Edit3} size={12} />編集モード</span>)}
            <button onClick={() => setIsEditing(!isEditing)} aria-label={isEditing ? '編集完了' : '編集開始'} className="hover-bg" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: breakpoint === 'sm' ? '8px 12px' : '10px 18px', background: isEditing ? 'var(--success)' : 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}><Icon icon={isEditing ? Check : Edit3} size={16} />{breakpoint !== 'sm' && (isEditing ? '完了' : '編集')}</button>

            <button
              onClick={() => setViewDensity(viewDensity === 'demo' ? 'compact' : 'demo')}
              aria-label="表示密度切替"
              className="hover-bg"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'background 0.2s'
              }}
              title={viewDensity === 'demo' ? 'コンパクト表示へ' : 'デモ表示へ'}
            >
              <Icon icon={Layers} size={16} />
              {breakpoint !== 'sm' && (viewDensity === 'demo' ? 'デモ' : 'コンパクト')}
            </button>
            <button onClick={() => setShowGlobalSettings(!showGlobalSettings)}<Icon icon={Settings} size={18} /></button>
          </div>
        </header>

        <GlobalSettingsPanel isOpen={showGlobalSettings} onClose={() => setShowGlobalSettings(false)} theme={theme} setTheme={(t) => { setTheme(t); setCustomAccent(themes[t].accent); }} customAccent={customAccent} setCustomAccent={setCustomAccent} enableTabTitle={enableTabTitle} setEnableTabTitle={setEnableTabTitle} backgroundType={backgroundType} setBackgroundType={setBackgroundType} backgroundImage={backgroundImage} setBackgroundImage={setBackgroundImage} />

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gridAutoRows: 'minmax(80px, auto)', gap: viewDensity === 'compact' ? (breakpoint === 'sm' ? '8px' : '12px') : (breakpoint === 'sm' ? '12px' : '20px'), paddingBottom: isEditing ? '100px' : '20px' }}>
          <div style={{ gridColumn: `span ${getSpan(6, 8, 4)}`, gridRow: 'span 1' }}><SearchWidget {...widgetProps} widgetId="search" isVisible={widgets.search.visible} /></div>
          <div style={{ gridColumn: `span ${getSpan(3, 4, 2)}`, gridRow: 'span 2' }}><ClockWidget {...widgetProps} widgetId="clock" isVisible={widgets.clock.visible} /></div>
          <div style={{ gridColumn: `span ${getSpan(3, 4, 2)}`, gridRow: 'span 2' }}><WeatherWidget {...widgetProps} widgetId="weather" isVisible={widgets.weather.visible} /></div>
          
          {/* Fix #5: Restored FlowTime widget */}
          <div style={{ gridColumn: `span ${getSpan(3, 4, 4)}`, gridRow: 'span 3' }}><FlowTimeWidget {...widgetProps} widgetId="flowtime" isVisible={widgets.flowtime.visible} /></div>
          
          <div style={{ gridColumn: `span ${getSpan(3, 4, 4)}`, gridRow: 'span 3' }}><NotificationTestWidget {...widgetProps} widgetId="notification" isVisible={widgets.notification.visible} /></div>
          
          {/* Fix #5: Restored Stats widget */}
          <div style={{ gridColumn: `span ${getSpan(6, 8, 4)}`, gridRow: 'span 3' }}><StatsWidget {...widgetProps} widgetId="stats" isVisible={widgets.stats.visible} /></div>
          
          <div style={{ gridColumn: `span ${getSpan(3, 4, 4)}`, gridRow: 'span 3' }}><TodoWidget {...widgetProps} widgetId="todo" isVisible={widgets.todo.visible} /></div>
          <div style={{ gridColumn: `span ${getSpan(3, 4, 4)}`, gridRow: 'span 3' }}><MusicPlayerWidget {...widgetProps} widgetId="music" isVisible={widgets.music.visible} /></div>
          <div style={{ gridColumn: `span ${getSpan(3, 4, 4)}`, gridRow: 'span 3' }}><VideoPlayerWidget {...widgetProps} widgetId="video" isVisible={widgets.video.visible} /></div>
          <div style={{ gridColumn: `span ${getSpan(6, 8, 4)}`, gridRow: 'span 2' }}><FeedTickerWidget {...widgetProps} widgetId="feed" isVisible={widgets.feed.visible} /></div>
          <div style={{ gridColumn: `span ${getSpan(3, 4, 2)}`, gridRow: 'span 2' }}><QuickLinksWidget {...widgetProps} widgetId="quicklinks" isVisible={widgets.quicklinks.visible} /></div>
        </div>

        {isEditing && (
          <div style={{ position: 'fixed', bottom: breakpoint === 'sm' ? '12px' : '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', padding: breakpoint === 'sm' ? '10px 16px' : '14px 24px', background: 'var(--surfaceSolid)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="hover-bright" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: breakpoint === 'sm' ? '8px 12px' : '10px 18px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)', fontWeight: 500, cursor: 'pointer', transition: 'filter 0.2s' }}><Icon icon={Plus} size={16} />{breakpoint !== 'sm' && 'ウィジェット追加'}</button>
            <button className="hover-bg" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: breakpoint === 'sm' ? '8px 12px' : '10px 18px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '10px', color: 'var(--text)', fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)', cursor: 'pointer', transition: 'background 0.2s' }}><Icon icon={RotateCcw} size={16} />{breakpoint !== 'sm' && 'リセット'}</button>
          </div>
        )}

        <SettingsSidebar isOpen={settingsSidebarOpen} onClose={() => setSettingsSidebarOpen(false)} />
      </div>
    </NotificationProvider>
  );
}