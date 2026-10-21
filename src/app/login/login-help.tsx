import { HelpIcon } from "./login-icons";

export function LoginHelp() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  const url = process.env.NEXT_PUBLIC_SUPPORT_URL;
  const hasContact = Boolean(email || phone || url);

  return (
    <div className="mt-6 border-t border-blue-100 pt-5 text-center">
      <p className="inline-flex items-center justify-center gap-2 text-xs text-mist">
        <HelpIcon className="h-4 w-4 text-accent" />
        <span>
          Need help? <span className="font-medium text-brand">Please contact your administrator.</span>
        </span>
      </p>
      {hasContact ? (
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink">
          {url ? (
            <a href={url} className="font-medium text-accent hover:underline">
              Support centre
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className="font-medium text-accent hover:underline">
              {email}
            </a>
          ) : null}
          {phone ? <span className="font-medium text-ink">{phone}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
