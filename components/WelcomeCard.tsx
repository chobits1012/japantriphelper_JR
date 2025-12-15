import React from 'react';
import { FileCode, ArrowRight, Zap, ShieldCheck } from 'lucide-react';

export const WelcomeCard: React.FC = () => {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-900/5 sm:p-10">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <FileCode size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ready for your Code</h2>
          <p className="text-slate-500">Initialization successful. Environment prepared.</p>
        </div>
      </div>

      <div className="mt-8 space-y-6 text-slate-600">
        <p className="leading-relaxed">
          Yes, you can absolutely paste your original project code here! This environment is pre-configured with 
          <strong> React 18</strong>, <strong>TypeScript</strong>, <strong>Tailwind CSS</strong>, and the <strong>Gemini API</strong>.
        </p>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-indigo-600">
              <Zap size={18} />
              <span className="font-semibold">Refactoring</span>
            </div>
            <p className="text-sm">Paste your legacy code, and I can help modernize it to React functional components and Hooks.</p>
          </div>
          
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-indigo-600">
              <ShieldCheck size={18} />
              <span className="font-semibold">Type Safety</span>
            </div>
            <p className="text-sm">I can automatically generate TypeScript interfaces for your JavaScript data structures.</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-blue-700">
          <p className="text-sm font-medium">
            <strong>Next Step:</strong> Simply copy your code files (e.g., App.js, components, etc.) and paste them into the chat prompt. Tell me what you want to achieve (e.g., "Convert this to TypeScript" or "Add a Gemini feature to this").
          </p>
        </div>
      </div>
    </div>
  );
};