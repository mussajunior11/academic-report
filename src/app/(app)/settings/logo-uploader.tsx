"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/lib/validation/helpers";

export function LogoUploader({
  logoUrl,
  uploadAction,
  removeAction,
  label = "Logo",
  alt = "Logo",
  previewClassName = "h-20 w-20",
}: {
  logoUrl: string | null;
  uploadAction: (formData: FormData) => Promise<ActionState>;
  removeAction: () => Promise<ActionState>;
  label?: string;
  alt?: string;
  previewClassName?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [state, formAction, uploading] = useActionState<ActionState, FormData>(
    async (_prev, formData) => uploadAction(formData),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.show(state.message ?? `${label} updated.`, "success");
      router.refresh();
    } else if (state && !state.ok && state.message) {
      toast.show(state.message, "error");
    }
  }, [state, router, toast, label]);

  const remove = () => {
    startTransition(async () => {
      const result = await removeAction();
      if (result?.ok) {
        toast.show(result.message ?? `${label} removed.`, "success");
        router.refresh();
      } else {
        toast.show(result?.message ?? `Could not remove the ${label.toLowerCase()}.`, "error");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className={`flex ${previewClassName} items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={alt} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400">No {label.toLowerCase()}</span>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="max-w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 file:hover:bg-slate-200"
          aria-label={`Choose ${label.toLowerCase()} file`}
        />
        <button type="submit" disabled={uploading} className={buttonClasses("primary", "sm")}>
          {uploading ? <Spinner className="h-4 w-4" /> : null}
          Upload {label.toLowerCase()}
        </button>
        {logoUrl ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={buttonClasses("secondary", "sm")}
          >
            {pending ? <Spinner className="h-4 w-4" /> : null}
            Remove
          </button>
        ) : null}
      </form>
    </div>
  );
}
