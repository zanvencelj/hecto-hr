interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm border border-gray-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
