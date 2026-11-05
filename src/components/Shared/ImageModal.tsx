import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Modal } from './Modal';

interface ImageModalProps {
  imageUrl: string;
  altText: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ imageUrl, altText, isOpen, onClose }: ImageModalProps) {
  if (!isOpen) return null;
  return <ImageDialog imageUrl={imageUrl} altText={altText} onClose={onClose} />;
}

function ImageDialog({ imageUrl, altText, onClose }: Omit<ImageModalProps, 'isOpen'>) {
  const [failed, setFailed] = useState(false);

  return (
    <Modal title={altText} onClose={onClose} size="xl" bodyClassName="p-2 sm:p-4 bg-gray-50">
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-500">
          <ImageOff className="w-10 h-10" aria-hidden="true" />
          <p>This image couldn't be loaded.</p>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={altText}
          onError={() => setFailed(true)}
          className="mx-auto max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
        />
      )}
    </Modal>
  );
}
