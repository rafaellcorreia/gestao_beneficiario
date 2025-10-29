import { useState, useRef } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { validarFoto } from "@/lib/validations";
import { toast } from "sonner";

interface PhotoCaptureProps {
  onPhotoCapture: (file: File, preview: string) => void;
  currentPhoto?: string;
  label?: string;
  required?: boolean;
}

export function PhotoCapture({
  onPhotoCapture,
  currentPhoto,
  label = "Foto do Funcionário",
  required = true,
}: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      });
      setStream(mediaStream);
      setIsCapturing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error("Erro ao acessar câmera. Verifique as permissões.");
      console.error(error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      const validation = validarFoto(file);

      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      const url = URL.createObjectURL(blob);
      setPreview(url);
      onPhotoCapture(file, url);
      stopCamera();
      toast.success("Foto capturada com sucesso!");
    }, "image/jpeg", 0.9);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validarFoto(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onPhotoCapture(file, result);
      toast.success("Foto carregada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>

      {!isCapturing && !preview && (
        <Card className="border-2 border-dashed border-border p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground max-w-md">
              Capture a foto frontal do rosto. Certifique-se que o rosto esteja
              bem iluminado e sem óculos escuros.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={startCamera}
                variant="default"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Abrir Câmera
              </Button>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Fazer Upload
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WEBP - Máximo 5MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Upload de foto"
          />
        </Card>
      )}

      {isCapturing && (
        <Card className="overflow-hidden">
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full"
              aria-label="Visualização da câmera"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <Button
                type="button"
                onClick={capturePhoto}
                size="lg"
                className="bg-primary hover:bg-primary-hover"
              >
                <Check className="mr-2 h-5 w-5" />
                Capturar
              </Button>
              <Button
                type="button"
                onClick={stopCamera}
                variant="secondary"
                size="lg"
              >
                <X className="mr-2 h-5 w-5" />
                Cancelar
              </Button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </Card>
      )}

      {preview && !isCapturing && (
        <Card className="overflow-hidden">
          <div className="relative">
            <img
              src={preview}
              alt="Preview da foto"
              className="w-full h-auto"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                type="button"
                onClick={clearPhoto}
                variant="destructive"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
