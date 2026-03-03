import { useRef, useEffect, useState } from "react";
import SignatureCanvasLib from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check } from "lucide-react";

interface SignatureCanvasProps {
  label: string;
  onSave: (dataUrl: string) => void;
  signatureData?: string;
}

export const SignatureCanvas = ({ label, onSave, signatureData }: SignatureCanvasProps) => {
  const sigCanvas = useRef<SignatureCanvasLib>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (signatureData && sigCanvas.current) {
      sigCanvas.current.fromDataURL(signatureData);
    }
  }, [signatureData]);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsSaved(false);
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.warning("Desenhe a assinatura primeiro antes de salvar.");
      return;
    }
    const dataUrl = sigCanvas.current?.toDataURL();
    if (dataUrl) {
      onSave(dataUrl);
      setIsSaved(true);
      toast.success("Assinatura capturada com sucesso!");
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
        <Button
          type="button"
          size="sm"
          onClick={save}
          className={isSaved ? "bg-teal-500 hover:bg-teal-600 text-white" : "bg-primary hover:bg-primary/90 text-white"}
        >
          {isSaved ? (
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-1.5" />
              Salva
            </span>
          ) : (
            "Salvar Assinatura"
          )}
        </Button>
      </div>
    </div>
  );
};
