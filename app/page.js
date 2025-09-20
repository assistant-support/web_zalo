import { auth } from "@/auth";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4">Chào mừng, {session?.user?.name}!</h1>
        <p className="mb-6">Bạn đã đăng nhập thành công. Nền tảng real-time đã được kích hoạt.</p>
        <div className="p-4 bg-gray-100 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Dữ liệu Session hiện tại</h2>
          <pre className="text-sm bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}