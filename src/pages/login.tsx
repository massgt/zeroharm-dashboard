import { FormEvent, useState } from "react";
import { useLocation, Link } from "wouter";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CompanyLogo from "@/assets/LogoMVM2.png";

export default function Login() {
  const { login, isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && isAdmin) {
    setLocation("/");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(password);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal. Periksa koneksi dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-7">
          <img src={CompanyLogo} alt="PT Minergo Visi Maxima" className="h-14 w-auto mb-4" />
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold">Admin Access</span>
          </div>
          <h1 className="text-2xl font-bold">Login Administrator</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Masukkan password administrator untuk mengakses fitur pengelolaan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-password" className="text-sm font-medium">Password</label>
            <div className="relative mt-1.5">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Masukkan password Admin"
                required
                className="pr-11"
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !password}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Memeriksa..." : "Login"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary underline underline-offset-4">
            Kembali ke Dashboard Viewer
          </Link>
        </div>
      </div>
    </div>
  );
}
