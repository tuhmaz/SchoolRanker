import { FileUploadZone } from '../FileUploadZone';
import { useState } from 'react';

export default function FileUploadZoneExample() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="p-6">
      <FileUploadZone
        onFileSelect={(f) => {
          setFile(f);
          console.log('File selected:', f.name);
        }}
        selectedFile={file}
        onClearFile={() => {
          setFile(null);
          console.log('File cleared');
        }}
      />
    </div>
  );
}
