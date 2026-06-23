import React, { useState, useCallback } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Upload, FileDown, Plus, Trash2, FileText, Settings, Loader2 } from 'lucide-react';
import fontURL from './assets/NotoSansJP-Regular.ttf';
interface BlankPageRule {
  id: string;
  afterPage: number;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [includeCover, setIncludeCover] = useState(true);
  const [year, setYear] = useState('2026');
  const [type, setType] = useState('共通テスト');
  const [subject, setSubject] = useState('');
  const [instructions, setInstructions] = useState('解答はすべて解答用紙に記入しなさい。\n試験時間は60分です。');
  const [blankPageRules, setBlankPageRules] = useState<BlankPageRule[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    }
  };

  const addBlankPageRule = () => {
    setBlankPageRules([...blankPageRules, { id: Math.random().toString(36).substr(2, 9), afterPage: 1 }]);
  };

  const removeBlankPageRule = (id: string) => {
    setBlankPageRules(blankPageRules.filter(rule => rule.id !== id));
  };

  const updateBlankPageRule = (id: string, afterPage: number) => {
    setBlankPageRules(blankPageRules.map(rule => rule.id === id ? { ...rule, afterPage } : rule));
  };

  const processPdf = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.registerFontkit(fontkit);

      // // Fetch Noto Sans JP font for Japanese support
      // const fontUrl = 'https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.7.woff2';
      // const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
      // const customFont = await pdfDoc.embedFont(fontBytes);

      // フォントをアセットフォルダから読み込む
      const fontBytes = await fetch(fontURL).then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();

      // 1. Create Cover Page (Optional)
      if (includeCover) {
        const coverPage = pdfDoc.insertPage(0, [width, height]);

        // Draw Cover Page Text
        const titleSize = 36;
        const yearSize = 24;
        const instructionSize = 14;

        coverPage.drawText(`${year}年度 ${type}`, {
          x: 50,
          y: height - 100,
          size: yearSize,
          font: customFont,
          color: rgb(0, 0, 0),
        });

        coverPage.drawText(subject, {
          x: 50,
          y: height - 160,
          size: titleSize,
          font: customFont,
          color: rgb(0, 0, 0),
        });

        coverPage.drawText('注意事項', {
          x: 50,
          y: height - 250,
          size: 18,
          font: customFont,
          color: rgb(0, 0, 0),
        });

        const lines = instructions.split('\n');
        lines.forEach((line, index) => {
          coverPage.drawText(line, {
            x: 50,
            y: height - 280 - (index * 25),
            size: instructionSize,
            font: customFont,
            color: rgb(0, 0, 0),
          });
        });
      }

      // 2. Insert Blank Pages
      const sortedRules = [...blankPageRules].sort((a, b) => b.afterPage - a.afterPage);
      
      for (const rule of sortedRules) {
        const insertIndex = includeCover ? rule.afterPage + 1 : rule.afterPage;
        if (rule.afterPage >= 0 && insertIndex <= pdfDoc.getPageCount()) {
           pdfDoc.insertPage(insertIndex, [width, height]);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF Processing Error:', error);
      alert('PDFの処理中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl shadow-lg mb-4">
            <FileText className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">テストPDF冊子整形ツール</h1>
          <p className="mt-2 text-gray-600">表紙の挿入と白紙の追加をブラウザ上で完結</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* File Upload Section */}
          <div className="p-8 border-b border-gray-100">
            <h2 className="text-lg font-semibold flex items-center mb-4">
              <Upload className="w-5 h-5 mr-2 text-blue-600" />
              1. PDFファイルのアップロード
            </h2>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="text-green-700">
                  <FileText className="w-12 h-12 mx-auto mb-2" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm opacity-75">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">PDFをドラッグ＆ドロップ、またはクリックして選択</p>
                </div>
              )}
            </div>
          </div>

          {/* Cover Page Settings */}
          <div className="p-8 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-600" />
                2. 表紙(1枚目)の設定
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCover}
                  onChange={(e) => setIncludeCover(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">表紙を追加する</span>
              </label>
            </div>
            
            {includeCover && (
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">年度</label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">試験の種類</label>
                    <input
                      type="text"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">科目名</label>
                  <input
                    type="text"
                    placeholder="例: 数学I・数学A"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">試験の注意事項</label>
                  <textarea
                    rows={4}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Blank Page Settings */}
          <div className="p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Plus className="w-5 h-5 mr-2 text-blue-600" />
                3. 白紙の挿入設定
              </h2>
              <button
                onClick={addBlankPageRule}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                追加
              </button>
            </div>
            
            {blankPageRules.length === 0 ? (
              <p className="text-gray-500 text-sm italic">白紙挿入の設定はありません</p>
            ) : (
              <div className="space-y-3">
                {blankPageRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 bg-white p-3 border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-600">
                      <input
                        type="number"
                        min="1"
                        value={rule.afterPage}
                        onChange={(e) => updateBlankPageRule(rule.id, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded mr-2 text-center"
                      />
                      ページ目の後に白紙を挿入
                    </span>
                    <button
                      onClick={() => removeBlankPageRule(rule.id)}
                      className="ml-auto text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={processPdf}
              disabled={!file || isProcessing}
              className={`flex items-center px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                !file || isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 mr-2" />
                  PDFを加工してダウンロード
                </>
              )}
            </button>
          </div>
        </div>
        
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>© 2026 共通テストPDF冊子整形ツール - 完全クライアントサイド動作</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
