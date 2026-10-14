import React from 'react';

interface Props {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
}

interface State {
  error: Error | null;
}

// اگر یک قالب چاپ هنگام رندر خطا بدهد، کل برنامه سفید نمی‌شود و خطا نمایش داده می‌شود
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-bold text-rose-600">{this.props.title || 'خطا در نمایش فاکتور'}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 break-words">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={this.props.onClose}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium"
            >
              بستن
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
