// Shared uploader UI used by every admin image field in the project.
import { useRef, useState, useCallback } from 'react';
import { HiOutlineCloudUpload, HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import { uploadImage } from '../../../features/media/api/imageUploadApi';
import './ImageUploader.css';

let imageIdCounter = 0;

/**
 * Standard project image flow: file -> IntelliJ backend -> Cloudinary -> URL -> form/DB.
 * Every future image field should reuse this component instead of storing browser blob URLs.
 *
 * @param {Array}    images          — Array of { id, url, file }
 * @param {Function} onImagesChange  — Callback with updated images array
 * @param {number}   maxSizeMB       — Max file size in MB (default 5)
 */
export default function ImageUploader({
  images = [],
  onImagesChange,
  maxSizeMB = 5,
  folder = 'general',
  multiple = true,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const emitChange = useCallback(
    (updater) => {
      if (typeof onImagesChange !== 'function') return;
      const currentList = Array.isArray(imagesRef.current) ? imagesRef.current : [];
      const nextList = typeof updater === 'function' ? updater(currentList) : updater;
      onImagesChange(nextList);
    },
    [onImagesChange]
  );

  const processFiles = useCallback(
    async (fileList) => {
      const filesToProcess = multiple ? Array.from(fileList) : Array.from(fileList).slice(0, 1);
      const newImages = [];

      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > maxSizeMB * 1024 * 1024) {
          imageIdCounter += 1;
          newImages.push({
            id: `img-${imageIdCounter}-${Date.now()}`,
            url: URL.createObjectURL(file),
            file: null,
            uploading: false,
            error: `Ảnh vượt quá dung lượng tối đa ${maxSizeMB}MB.`,
          });
          continue;
        }
        imageIdCounter += 1;
        newImages.push({
          id: `img-${imageIdCounter}-${Date.now()}`,
          url: URL.createObjectURL(file),
          file,
          uploading: true,
        });
      }

      if (newImages.length > 0) {
        emitChange((prev) => (multiple ? [...prev, ...newImages] : [...newImages]));

        const uploadable = newImages.filter((img) => img.uploading && img.file);
        const uploaded = await Promise.all(
          uploadable.map(async (image) => {
            try {
              const result = await uploadImage(image.file, folder);
              URL.revokeObjectURL(image.url);
              return {
                ...image,
                url: result.url,
                publicId: result.public_id,
                file: null,
                uploading: false,
              };
            } catch (error) {
              return {
                ...image,
                uploading: false,
                error: error?.message || 'Không thể tải ảnh lên.',
              };
            }
          })
        );

        const byId = new Map(uploaded.map((img) => [img.id, img]));
        emitChange((current) => current.map((img) => byId.get(img.id) || img));
      }
    },
    [emitChange, maxSizeMB, folder, multiple]
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
    emitChange((prev) => prev.filter((img) => img.id !== id));
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

      {/* Styled control bar with branded red button */}
      <div className="image-uploader__footer">
        <button
          type="button"
          className="image-uploader__browse-btn"
          onClick={handleClick}
        >
          <HiOutlineUpload size={16} />
          <span>CHỌN TỆP</span>
        </button>
        <span className="image-uploader__status-text">
          {images.length > 0 ? `Đã chọn ${images.length} ảnh` : 'Chưa có tệp nào được chọn'}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="image-uploader__file-input"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="image-uploader__thumbs">
          {images.map((img) => (
            <div
              key={img.id}
              className={`image-uploader__thumb ${img.uploading ? 'image-uploader__thumb--uploading' : ''} ${img.error ? 'image-uploader__thumb--error' : ''}`}
              title={img.error || (img.uploading ? 'Đang tải ảnh lên Cloudinary...' : '')}
            >
              <img src={img.url} alt="" className="image-uploader__thumb-img" />
              {img.uploading && (
                <div className="image-uploader__overlay">
                  <div className="image-uploader__spinner" />
                </div>
              )}
              {img.error && <div className="image-uploader__error-badge">!</div>}
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
