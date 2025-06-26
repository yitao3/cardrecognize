'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Image from "next/image";

interface RecognitionResult {
  country?: string;
  name?: string;
  position?: string;
  company?: string;
  phone?: string;
  error?: string;
}

function PasswordScreen({ onPasswordSubmit }: { onPasswordSubmit: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await onPasswordSubmit(password);
    if (!success) {
      setError('密码错误，请重试');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">请输入密码</h2>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button type="submit" className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          进入
        </button>
      </form>
    </div>
  );
}

// 并发池工具函数
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  const running: Promise<void>[] = [];

  async function runOne() {
    if (index >= tasks.length) return;
    const curIndex = index++;
    try {
      results[curIndex] = await tasks[curIndex]();
    } catch {
      results[curIndex] = undefined as unknown as T;
    }
    await runOne();
  }

  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    running.push(runOne());
  }
  await Promise.all(running);
  return results;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRecognizingAll, setIsRecognizingAll] = useState(false);
  const [files, setFiles] = useState<(File & { preview: string })[]>([]);
  const [results, setResults] = useState<Record<string, RecognitionResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('isAuthenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = async (password: string) => {
    try {
      await axios.post('/api/verify-password', { password });
      sessionStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  };

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
      
      try {
        const parsedContent = JSON.parse(content);
        setResults(prev => ({ ...prev, [file.name]: parsedContent }));
      } catch (e) {
        console.error("Failed to parse JSON response:", e, "Content:", content);
        setResults(prev => ({ ...prev, [file.name]: { error: '返回结果格式错误' } }));
      }

    } catch (error) {
      console.error('Recognition failed:', error);
      let displayError = '识别失败';
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.error || '识别失败';
        const apiError = error.response.data?.apiError;
        displayError = errorMessage;
        if (apiError && typeof apiError === 'object') {
          displayError += `: ${JSON.stringify(apiError)}`;
        } else if (apiError) {
          displayError += `: ${apiError}`;
        }
      }
      setResults(prev => ({ ...prev, [file.name]: { error: displayError } }));
    } finally {
      setLoading(prev => ({ ...prev, [file.name]: false }));
    }
  };

  const handleRecognizeAll = async () => {
    setIsRecognizingAll(true);
    const filesToRecognize = files.filter(file => !results[file.name]);
    const tasks = filesToRecognize.map(file => () => handleRecognize(file));
    try {
      await runWithConcurrency(tasks, 5);
    } catch (error) {
      console.error("An error occurred during batch recognition:", error);
    } finally {
      setIsRecognizingAll(false);
    }
  };

  const handleClearAll = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setResults({});
    setLoading({});
  };

  if (!isAuthenticated) {
    return <PasswordScreen onPasswordSubmit={handlePasswordSubmit} />;
  }

  const isAnyLoading = isRecognizingAll || Object.values(loading).some(v => v);
  const allRecognized = files.length > 0 && files.every(file => !!results[file.name]);

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
                disabled={isAnyLoading || allRecognized}
              >
                {isAnyLoading ? '识别中...' : (allRecognized ? '全部已识别' : '全部识别')}
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
                <div className="relative w-full h-40">
                  <Image
                    src={file.preview}
                    alt={file.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    onLoad={() => URL.revokeObjectURL(file.preview)}
                  />
                </div>
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
                    <th className="px-4 py-2 border border-gray-300">国家</th>
                    <th className="px-4 py-2 border border-gray-300">姓名</th>
                    <th className="px-4 py-2 border border-gray-300">职位</th>
                    <th className="px-4 py-2 border border-gray-300">企业名称</th>
                    <th className="px-4 py-2 border border-gray-300">提取的号码</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([fileName, info]) => (
                    <tr key={fileName}>
                      <td className="px-4 py-2 border border-gray-300">{fileName}</td>
                      <td className="px-4 py-2 border border-gray-300">{info.country || ''}</td>
                      <td className="px-4 py-2 border border-gray-300">{info.name || ''}</td>
                      <td className="px-4 py-2 border border-gray-300">{info.position || ''}</td>
                      <td className="px-4 py-2 border border-gray-300">{info.company || ''}</td>
                      <td className="px-4 py-2 border border-gray-300 font-mono">{info.phone || info.error || ''}</td>
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
