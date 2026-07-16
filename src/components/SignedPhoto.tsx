import { useEffect, useState } from "react";
import { getSignedPhotoUrl } from "@/lib/photo-utils";

interface SignedPhotoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** URL pública antiga ou caminho armazenado no banco */
  stored: string;
  /** Envolve a imagem em um link que abre a foto em nova aba */
  openOnClick?: boolean;
}

/** Exibe uma foto do bucket privado resolvendo a URL assinada sob demanda. */
const SignedPhoto = ({ stored, openOnClick, className, ...imgProps }: SignedPhotoProps) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSignedPhotoUrl(stored).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [stored]);

  if (!src) {
    return <div className={`${className || ""} animate-pulse bg-slate-200 dark:bg-slate-800`} />;
  }

  const img = <img src={src} className={className} {...imgProps} />;

  if (openOnClick) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer">
        {img}
      </a>
    );
  }
  return img;
};

export default SignedPhoto;
