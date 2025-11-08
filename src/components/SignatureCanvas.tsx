import { useRef, useEffect } from "react";
import SignatureCanvasLib from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SignatureCanvasProps {
  label: string;
  onSave: (dataUrl: string) => void;
  signatureData?: string;
}

export const SignatureCanvas = ({ label, onSave, signatureData }: SignatureCanvasProps) => {
  const sigCanvas = useRef<SignatureCanvasLib>(null);

  useEffect(() => {
    if (signatureData && sigCanvas.current) {
      sigCanvas.current.fromDataURL(signatureData);
    }
  }, [signatureData]);

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      return;
    }
    const dataUrl = sigCanvas.current?.toDataURL();
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">{label}</Label>
      <div className="border-2 border-border rounded-lg bg-white">
        <SignatureCanvasLib
          ref={sigCanvas}
          canvasProps={{
            className: "w-full h-40",
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Limpar
        </Button>
        <Button type="button" size="sm" onClick={save}>
          Salvar Assinatura
        </Button>
      </div>
    </div>
  );
};
