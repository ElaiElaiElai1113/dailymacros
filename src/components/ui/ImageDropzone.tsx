import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  currentImage?: string | null;
  accept?: Record<string, string[]>;
  maxSize?: number; // in bytes
  className?: string;
}

export function ImageDropzone({
  onUpload,
  currentImage,
  accept = { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
  maxSize = 5 * 1024 * 1024, // 5MB
  className = "",
}: ImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);
      setSuccess(false);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Invalid file type. Please upload an image.");
        } else {
          setError("Failed to upload file");
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Simulate upload progress
      setUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      try {
        await onUpload(file);
        setUploadProgress(100);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } catch (err: any) {
        setError(err.message || "Failed to upload image");
        setPreview(null);
      } finally {
        clearInterval(progressInterval);
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 500);
      }
    },
    [onUpload, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const removeImage = () => {
    setPreview(null);
    setError(null);
    setSuccess(false);
  };

  const displayImage = preview || currentImage;

  return (
    <div className={cn("w-full", className)}>
      <div {...getRootProps()} className={cn(
        "relative w-full rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200",
        isDragActive && !isDragReject
          ? "border-[#D26E3D] bg-[#D26E3D]/5"
          : "border-gray-300 hover:border-gray-400 bg-gray-50/50",
        isDragReject && "border-red-300 bg-red-50/50",
        (displayImage || uploading) && "border-solid p-0"
      )}>
        <input {...getInputProps()} />

        {displayImage && !uploading ? (
          <div className="relative group">
            <img
              src={displayImage}
              alt="Preview"
              className="h-64 w-full object-contain rounded-xl"
            />
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"
                >
                  <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-900">Uploaded!</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remove button */}
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        ) : uploading ? (
          <div className="py-8">
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-12 w-12 text-[#D26E3D]" />
              </motion.div>
              <div className="space-y-2 w-full max-w-xs">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#D26E3D] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <motion.div
              animate={
                isDragActive
                  ? { y: [0, -10, 0], scale: [1, 1.05, 1] }
                  : { y: [0, 0, 0], scale: [1, 1, 1] }
              }
              transition={{ duration: 0.5 }}
            >
              {isDragReject ? (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-red-100 rounded-full">
                      <X className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-600 mb-1">
                    File not supported
                  </p>
                  <p className="text-xs text-gray-500">
                    Please upload an image file (PNG, JPG, GIF, WebP)
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <motion.div
                      animate={
                        isDragActive
                          ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, -5, 0] }
                          : { scale: [1, 1, 1], rotate: 0 }
                      }
                      transition={{ duration: 0.4 }}
                      className={cn(
                        "p-4 rounded-full transition-colors",
                        isDragActive
                          ? "bg-[#D26E3D]/20"
                          : "bg-gray-100"
                      )}
                    >
                      <Upload
                        className={cn(
                          "h-8 w-8 transition-colors",
                          isDragActive ? "text-[#D26E3D]" : "text-gray-600"
                        )}
                      />
                    </motion.div>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {isDragActive ? "Drop your image here" : "Drag & drop image"}
                  </p>
                  <p className="text-xs text-gray-500">
                    or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PNG, JPG, GIF, WebP up to {maxSize / 1024 / 1024}MB
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
