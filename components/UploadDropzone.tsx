import React, { useState } from 'react'

const Upload = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

export default function UploadDropzone({ onFile }: { onFile: (f: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={`${isDragging ? "border-2 border-blue-500 ring-4 ring-blue-100" : "border border-white/40"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="cursor-pointer">
        <input 
          type="file" 
          accept="application/pdf,image/*" 
          className="hidden" 
          onChange={handle} 
        />
        
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">
          Upload Statement
        </h3>
        
        <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6 md:mb-8 px-2">
          We support PDF, JPG, PNG. 100% data-secure.
        </p>

        <div className="bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-lg sm:rounded-xl p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center group hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          
          <p className="text-slate-600 font-medium text-xs sm:text-sm md:text-base px-2">
            <span className="hidden sm:inline">Drag & drop your statement or </span>
            <span className="sm:hidden">Tap to </span>
            <span className="text-blue-600">Upload</span>
          </p>
        </div>
      </label>
    </div>
  );
}
