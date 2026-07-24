import { useRef, useEffect, useState, useCallback } from "react";
import SignatureCanvasLib from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Eraser } from "lucide-react";

interface SignatureCanvasProps {
  label?: string;
  onSave: (dataUrl: string) => void;
  signatureData?: string;
}

export const SignatureCanvas = ({ label, onSave, signatureData }: SignatureCanvasProps) => {
  const sigCanvas = useRef<SignatureCanvasLib>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Redimensionar o canvas com precisão sem distorcer o traço
  const resizeCanvas = useCallback(() => {
    if (containerRef.current && sigCanvas.current) {
      const canvas = sigCanvas.current.getCanvas();
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const data = sigCanvas.current.toDataURL();
        const isEmpty = sigCanvas.current.isEmpty();
        
        canvas.width = rect.width;
        canvas.height = rect.height;

        if (!isEmpty && data) {
          sigCanvas.current.fromDataURL(data);
        } else if (signatureData) {
          sigCanvas.current.fromDataURL(signatureData);
        }
      }
    }
  }, [signatureData]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (signatureData && sigCanvas.current) {
      sigCanvas.current.fromDataURL(signatureData);
      setHasSignature(true);
    } else if (!signatureData && sigCanvas.current && !hasSignature) {
      sigCanvas.current.clear();
    }
  }, [signatureData]);

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL("image/png");
      setHasSignature(true);
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setHasSignature(false);
      onSave("");
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</Label>
          {hasSignature && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3 h-3" /> Assinada
            </span>
          )}
        </div>
      )}

      <div ref={containerRef} className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 h-36 overflow-hidden shadow-inner group">
        <SignatureCanvasLib
          ref={sigCanvas}
          onEnd={handleEnd}
          penColor="#0f172a"
          canvasProps={{
            className: "w-full h-full cursor-crosshair touch-none",
          }}
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-600 text-xs font-medium">
            Assine aqui com o dedo ou mouse
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Eraser className="w-3.5 h-3.5 mr-1" />
          Limpar Assinatura
        </Button>

        {hasSignature && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Assinatura capturada
          </span>
        )}
      </div>
    </div>
  );
};
