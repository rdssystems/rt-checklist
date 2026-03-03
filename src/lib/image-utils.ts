/**
 * Utilidade para compressão de imagens no lado do cliente.
 * Reduz o tamanho do arquivo antes do upload para economizar banda e armazenamento.
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maintainAspectRatio?: boolean;
}

export const compressImage = (file: File, options: CompressionOptions = {}): Promise<Blob> => {
    const {
        maxWidth = 1080,
        maxHeight = 1080,
        quality = 0.7,
        maintainAspectRatio = true
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
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

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
};
