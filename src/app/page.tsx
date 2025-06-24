'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Image from "next/image";

interface RecognitionResult {
  role: string;
  type: string;
  text: string;
}

export default function Home() {
  const [files, setFiles] = useState<(File & { preview: string })[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [
      ...prevFiles,
      ...acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
      }))
    ]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg']
    }
  });

  const handleRecognize = async (file: File) => {
    setLoading(prev => ({ ...prev, [file.name]: true }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/recognize', formData);
      const content = response.data.choices[0].message.content;
      
      setResults(prev => ({ ...prev, [file.name]: content }));

    } catch (error: any) {
      console.error('Recognition failed:', error);
      const errorMessage = error.response?.data?.error || '识别失败';
      const apiError = error.response?.data?.apiError;
      let displayError = errorMessage;
      if (apiError && typeof apiError === 'object') {
        displayError += `: ${JSON.stringify(apiError)}`;
      } else if (apiError) {
        displayError += `: ${apiError}`;
      }
      setResults(prev => ({ ...prev, [file.name]: displayError }));
    } finally {
      setLoading(prev => ({ ...prev, [file.name]: false }));
    }
  };

  const handleRecognizeAll = () => {
    files.forEach(file => {
      if (!results[file.name]) {
        handleRecognize(file);
      }
    });
  };

  const handleClearAll = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setResults({});
    setLoading({});
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center justify-center">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl font-bold text-center mb-8">名片识别</h1>
          <div
            {...getRootProps()}
            className="w-full p-8 text-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition"
          >
            <input {...getInputProps()} />
            <p className="text-gray-500">将文件拖放到此处，或单击以上传</p>
          </div>

          {files.length > 0 && (
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={handleRecognizeAll}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                disabled={Object.values(loading).some(v => v)}
              >
                {Object.values(loading).some(v => v) ? '识别中...' : '全部识别'}
              </button>
              <button
                onClick={handleClearAll}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                全部清除
              </button>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {files.map(file => (
              <div key={file.name} className="border rounded-lg overflow-hidden shadow-lg bg-white">
                <img src={file.preview} alt={file.name} className="w-full h-40 object-cover" />
                <div className="p-4">
                  <p className="text-sm font-semibold truncate">{file.name}</p>
                  <button
                    onClick={() => handleRecognize(file)}
                    className="w-full mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm disabled:bg-gray-100"
                    disabled={loading[file.name] || !!results[file.name]}
                  >
                    {loading[file.name] ? '识别中...' : results[file.name] ? '已识别' : '识别'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(results).length > 0 && (
            <div className="mt-8 w-full">
              <h2 className="text-2xl font-bold text-center mb-4">识别结果</h2>
              <table className="w-full table-auto border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 border border-gray-300">图片名</th>
                    <th className="px-4 py-2 border border-gray-300">提取的号码</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([fileName, number]) => (
                    <tr key={fileName}>
                      <td className="px-4 py-2 border border-gray-300">{fileName}</td>
                      <td className="px-4 py-2 border border-gray-300 font-mono">{number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
