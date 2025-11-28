import React, { useRef } from 'react';

interface FileUploadProps {
  label: string;
  subLabel?: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  accept?: string;
  previewUrl?: string;
  badge?: string;
  required?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  subLabel,
  file,
  onFileSelect,
  accept = "image/*",
  previewUrl,
  badge,
  required
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {badge && (
          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      
      <div 
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all duration-200
          min-h-[200px] flex flex-col items-center justify-center text-center overflow-hidden
          ${file ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'}
        `}
      >
        <input 
          type="file" 
          ref={inputRef}
          className="hidden" 
          accept={accept}
          onChange={handleChange}
        />

        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
             <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-2">
                📂
             </div>
            <p className="text-sm font-medium text-gray-600">Click to Upload</p>
            {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
          </div>
        )}

        {previewUrl && (
             <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-medium text-sm bg-black/50 px-3 py-1 rounded-full">Change Image</span>
             </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;