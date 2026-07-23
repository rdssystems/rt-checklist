/**
 * Utilidade ultra-rápida para compressão de imagens no lado do cliente.
 * Utiliza URL.createObjectURL para evitar alocação excessiva de memória em dispositivos móveis.
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maintainAspectRatio?: boolean;
}

export const compressImage = (file: Blob | File, options: CompressionOptions = {}): Promise<Blob> => {
    const {
        maxWidth = 1024,
        maxHeight = 1024,
        quality = 0.7,
        maintainAspectRatio = true
    } = options;

    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let width = img.width;
            let height = img.height;

            if (maintainAspectRatio) {
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
            } else {
                width = Math.min(width, maxWidth);
                height = Math.min(height, maxHeight);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Não foi possível obter o contexto do canvas'));
                return;
            }

            // Ativar suavização para máxima qualidade visual
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Erro na conversão do canvas para Blob'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };

        img.src = objectUrl;
    });
};
