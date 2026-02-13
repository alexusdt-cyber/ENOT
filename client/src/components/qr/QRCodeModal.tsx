import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Download, Share2 } from 'lucide-react';
import { 
  generateQRCode, 
  downloadQRCode, 
  shareQRCode,
  QRCodeType,
  GenerateQRCodeOptions 
} from '../../lib/qrCodeGenerator';
import QRCodeStyling from 'qr-code-styling';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: string;
  type: QRCodeType;
  title?: string;
  subtitle?: string;
  networkCode?: string;
  logoUrl?: string;
  copyText?: string;
  isDark?: boolean;
}

export function QRCodeModal({
  isOpen,
  onClose,
  data,
  type,
  title = 'QR Code',
  subtitle,
  networkCode,
  logoUrl,
  copyText,
  isDark = false
}: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (isOpen && data) {
      const options: GenerateQRCodeOptions = {
        data,
        type,
        networkCode,
        logoUrl,
        size: 320,
        useSvg: true
      };
      
      const qr = generateQRCode(options);
      setQrCode(qr);
      
      if (qrRef.current) {
        qrRef.current.innerHTML = '';
        qr.append(qrRef.current);
      }
      
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        setCanShare(true);
      }
    }
    
    return () => {
      setShowActions(false);
      setCanShare(false);
    };
  }, [isOpen, data, type, networkCode, logoUrl]);

  const handleCopy = async () => {
    const textToCopy = copyText || data;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownload = async () => {
    if (qrCode) {
      const filename = `qr-${type.toLowerCase()}-${Date.now()}`;
      await downloadQRCode(qrCode, filename, 'png');
    }
  };

  const handleShare = async () => {
    if (qrCode) {
      const success = await shareQRCode(qrCode, title, subtitle || data);
      if (!success) {
        handleDownload();
      }
    }
  };

  const handleQRClick = () => {
    setShowActions(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        data-testid="qr-modal-overlay"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden ${
            isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white shadow-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
          data-testid="qr-modal"
        >
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${
              isDark 
                ? 'text-slate-400 hover:text-white hover:bg-slate-700' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            data-testid="qr-modal-close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h3>
              {subtitle && (
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {subtitle}
                </p>
              )}
            </div>

            <div className="relative flex justify-center mb-6">
              <motion.div
                className={`relative p-3 rounded-2xl cursor-pointer transition-shadow overflow-hidden ${
                  isDark ? 'bg-white' : 'bg-gray-50'
                } ${showActions ? 'shadow-lg ring-2 ring-blue-500/50' : ''}`}
                onClick={handleQRClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="qr-code-container"
              >
                <div 
                  ref={qrRef} 
                  className="[&>svg]:w-[260px] [&>svg]:h-[260px] [&>canvas]:w-[260px] [&>canvas]:h-[260px]"
                />
                
                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2"
                    >
                      <motion.button
                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                        className="p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg text-gray-700 hover:bg-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        data-testid="qr-download-btn"
                        title="Скачать"
                      >
                        <Download className="w-5 h-5" />
                      </motion.button>
                      
                      {canShare && (
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); handleShare(); }}
                          className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg text-white"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          data-testid="qr-share-btn"
                          title="Поделиться"
                        >
                          <Share2 className="w-5 h-5" />
                        </motion.button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <div 
              className={`flex items-center gap-2 p-3 rounded-xl ${
                isDark ? 'bg-slate-700/50' : 'bg-gray-100'
              }`}
            >
              <div className="flex-1 overflow-hidden">
                <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Адрес
                </p>
                <p 
                  className={`text-sm font-mono truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
                  title={copyText || data}
                >
                  {copyText || data}
                </p>
              </div>
              <motion.button
                onClick={handleCopy}
                className={`flex-shrink-0 p-2.5 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-emerald-500 text-white' 
                    : isDark 
                      ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="qr-copy-btn"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </motion.button>
            </div>

            <p className={`text-center text-xs mt-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Нажмите на QR код для скачивания или отправки
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QRCodeModal;
