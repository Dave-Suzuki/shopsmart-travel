import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { showError } from '../../utils/toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageSelected: (file: File | null) => void;
  onImageRemoved?: () => void;
}

export function ImageUpload({ currentImageUrl, onImageSelected, onImageRemoved }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showError('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelected(file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageSelected(null);
    if (onImageRemoved) {
      onImageRemoved();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <p className="block text-sm font-medium text-gray-700">
        Product Image
      </p>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            aria-label="Remove image"
            className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors duration-200">
              <X className="w-4 h-4" aria-hidden="true" />
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
        >
          <div className="flex items-center gap-2" aria-hidden="true">
            <Upload className="w-6 h-6" />
            <ImageIcon className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium">Click to upload image</span>
          <span className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
