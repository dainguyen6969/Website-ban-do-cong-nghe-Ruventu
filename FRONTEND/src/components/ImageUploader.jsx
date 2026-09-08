import { useRef, useState, useCallback } from 'react';
import { HiOutlineCloudUpload, HiOutlineX } from 'react-icons/hi';
import './ImageUploader.css';

let imageIdCounter = 0;

/**
 * Reusable drag-and-drop + click-to-browse image uploader.
 * Displays thumbnails with hover-to-remove overlay.
 *
 * @param {Array}    images          — Array of { id, url, file }
 * @param {Function} onImagesChange  — Callback with updated images array
 * @param {number}   maxSizeMB       — Max file size in MB (default 5)
 */
export default function ImageUploader({ images = [], onImagesChange, maxSizeMB = 5 }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFiles = useCallback(
    (fileList) => {
      const newImages = [];
      for (const file of fileList) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > maxSizeMB * 1024 * 1024) continue;
        imageIdCounter += 1;
        newImages.push({
          id: `img-${imageIdCounter}-${Date.now()}`,
          url: URL.createObjectURL(file),
          file,
        });
      }
      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    },
    [images, onImagesChange, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files?.length) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleRemove = (id) => {
    const updated = images.filter((img) => img.id !== id);
    onImagesChange(updated);
  };

  return (
    <div className="image-uploader">
      {/* Drop zone */}
      <div
        className={`image-uploader__dropzone ${isDragOver ? 'image-uploader__dropzone--drag-over' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <HiOutlineCloudUpload size={36} className="image-uploader__icon" />
        <span className="image-uploader__text">Kéo thả ảnh hoặc click để tải lên</span>
        <span className="image-uploader__hint">JPG, PNG, WEBP – Tối đa {maxSizeMB}MB / ảnh</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="image-uploader__file-input"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="image-uploader__thumbs">
          {images.map((img) => (
            <div key={img.id} className="image-uploader__thumb">
              <img src={img.url} alt="" className="image-uploader__thumb-img" />
              <button
                type="button"
                className="image-uploader__thumb-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(img.id);
                }}
                aria-label="Xóa ảnh"
              >
                <HiOutlineX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
