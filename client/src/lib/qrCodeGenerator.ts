import QRCodeStyling, { 
  Options, 
  DotType, 
  CornerSquareType, 
  CornerDotType,
  GradientType
} from 'qr-code-styling';

export type QRCodeType = 'CryptoWallet' | 'PersonalLink' | 'Custom';

export interface QRCodePreset {
  type: QRCodeType;
  dotsStyle: DotType;
  cornersSquareStyle: CornerSquareType;
  cornersDotStyle: CornerDotType;
  colorType: 'single' | 'gradient';
  color?: string;
  gradientColors?: { start: string; end: string };
  gradientType?: GradientType;
  imageUrl?: string;
  imageMargin?: number;
  imageSize?: number;
  width?: number;
  height?: number;
  margin?: number;
  backgroundColor?: string;
}

const NETWORK_COLORS: Record<string, string> = {
  TRON: '#eb0029',
  BSC: '#f3ba2f',
  TON: '#0088cc',
  ETH: '#627eea',
  POLYGON: '#8247e5',
  ARBITRUM: '#2d374b',
  SOLANA: '#9945ff',
  AVALANCHE: '#e84142',
  POLKADOT: '#e6007a',
  TEZOS: '#2c7df7',
  XRP: '#23292f',
  DOGECOIN: '#c2a633',
  CARDANO: '#0033ad',
  MONERO: '#ff6600'
};

const PRESETS: Record<QRCodeType, Omit<QRCodePreset, 'type'>> = {
  CryptoWallet: {
    dotsStyle: 'dots',
    cornersSquareStyle: 'extra-rounded',
    cornersDotStyle: 'dot',
    colorType: 'single',
    color: '#0088cc',
    imageMargin: 12,
    imageSize: 0.35,
    width: 400,
    height: 400,
    margin: 15,
    backgroundColor: '#ffffff'
  },
  PersonalLink: {
    dotsStyle: 'dots',
    cornersSquareStyle: 'extra-rounded',
    cornersDotStyle: 'dot',
    colorType: 'gradient',
    gradientColors: { start: '#9333ea', end: '#c026d3' },
    gradientType: 'linear',
    imageUrl: '/favicon.png',
    imageMargin: 12,
    imageSize: 0.3,
    width: 400,
    height: 400,
    margin: 15,
    backgroundColor: '#ffffff'
  },
  Custom: {
    dotsStyle: 'square',
    cornersSquareStyle: 'square',
    cornersDotStyle: 'square',
    colorType: 'single',
    color: '#000000',
    width: 400,
    height: 400,
    margin: 15,
    backgroundColor: '#ffffff'
  }
};

export interface GenerateQRCodeOptions {
  data: string;
  type: QRCodeType;
  networkCode?: string;
  logoUrl?: string;
  size?: number;
  useSvg?: boolean;
  overrides?: Partial<QRCodePreset>;
}

export function generateQRCode(options: GenerateQRCodeOptions): QRCodeStyling {
  const { data, type, networkCode, logoUrl, size, useSvg = true, overrides } = options;
  
  const preset = { ...PRESETS[type], ...overrides };
  
  let dotsColor = preset.color || '#000000';
  let imageUrl = logoUrl || preset.imageUrl;
  
  if (type === 'CryptoWallet' && networkCode) {
    dotsColor = NETWORK_COLORS[networkCode] || preset.color || '#0088cc';
  }
  
  const finalSize = size || preset.width || 400;
  
  const qrOptions: Options = {
    type: useSvg ? 'svg' : 'canvas',
    width: finalSize,
    height: finalSize,
    data,
    margin: preset.margin || 15,
    dotsOptions: {
      type: preset.dotsStyle,
      ...(preset.colorType === 'gradient' && preset.gradientColors ? {
        gradient: {
          type: preset.gradientType || 'linear',
          rotation: 45,
          colorStops: [
            { offset: 0, color: preset.gradientColors.start },
            { offset: 1, color: preset.gradientColors.end }
          ]
        }
      } : {
        color: dotsColor
      })
    },
    cornersSquareOptions: {
      type: preset.cornersSquareStyle,
      color: '#000000'
    },
    cornersDotOptions: {
      type: preset.cornersDotStyle,
      color: '#000000'
    },
    backgroundOptions: {
      color: preset.backgroundColor || '#ffffff'
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: preset.imageMargin || 12,
      imageSize: preset.imageSize || 0.35
    }
  };
  
  if (imageUrl) {
    qrOptions.image = imageUrl;
  }
  
  return new QRCodeStyling(qrOptions);
}

export function getNetworkColor(networkCode: string): string {
  return NETWORK_COLORS[networkCode] || '#0088cc';
}

export async function downloadQRCode(
  qrCode: QRCodeStyling, 
  filename: string = 'qrcode',
  extension: 'png' | 'jpeg' | 'webp' | 'svg' = 'png'
): Promise<void> {
  await qrCode.download({
    name: filename,
    extension
  });
}

export async function getQRCodeBlob(
  qrCode: QRCodeStyling,
  type: 'png' | 'jpeg' | 'webp' | 'svg' = 'png'
): Promise<Blob | null> {
  const data = await qrCode.getRawData(type);
  if (data instanceof Blob) {
    return data;
  }
  return null;
}

export async function shareQRCode(
  qrCode: QRCodeStyling,
  title: string = 'QR Code',
  text: string = ''
): Promise<boolean> {
  try {
    if (typeof navigator.share !== 'function') {
      return false;
    }
    
    const blob = await getQRCodeBlob(qrCode, 'png');
    if (!blob) return false;
    
    const file = new File([blob], 'qrcode.png', { type: 'image/png' });
    
    const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    
    if (canShareFiles) {
      await navigator.share({
        title,
        text,
        files: [file]
      });
      return true;
    } else {
      await navigator.share({
        title,
        text: text || title
      });
      return true;
    }
  } catch (error) {
    console.error('Share failed:', error);
    return false;
  }
}
