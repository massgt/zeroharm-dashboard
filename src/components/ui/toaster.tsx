import { Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const hasAuthSuccess = toasts.some(({ title }) =>
    title === "Login berhasil" || title === "Logout berhasil"
  )

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isAuthSuccess =
          title === "Login berhasil" || title === "Logout berhasil"

        return (
          <Toast
            key={id}
            {...props}
            duration={isAuthSuccess ? 3200 : props.duration}
            className={
              isAuthSuccess
                ? "auth-success-toast pointer-events-auto relative flex w-full max-w-[380px] flex-col items-center gap-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white px-8 py-7 text-center shadow-2xl"
                : undefined
            }
          >
            {isAuthSuccess && (
              <div className="auth-success-icon" aria-hidden="true">
                <Check className="auth-success-check h-10 w-10" strokeWidth={3} />
              </div>
            )}
            <div className="grid justify-items-center gap-1">
              {title && (
                <ToastTitle className={isAuthSuccess ? "text-xl font-bold text-slate-900" : undefined}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className={isAuthSuccess ? "mt-1 text-sm text-slate-500" : undefined}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            {isAuthSuccess && <div className="auth-success-progress" aria-hidden="true" />}
          </Toast>
        )
      })}
      <ToastViewport
        className={
          hasAuthSuccess
            ? "auth-success-viewport fixed inset-0 z-[100] flex h-full w-full max-w-none items-center justify-center p-4 pointer-events-none before:fixed before:inset-0 before:z-[-1] before:bg-slate-950/35 before:backdrop-blur-[2px] sm:bottom-auto sm:right-auto sm:top-0 sm:flex-col"
            : undefined
        }
      />
    </ToastProvider>
  )
}
