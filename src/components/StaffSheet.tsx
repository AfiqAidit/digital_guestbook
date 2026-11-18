"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { useI18n } from "@/lib/i18n";
import { useStaff } from "@/lib/staff";

/**
 * The hidden "staff access" popup (opened by tapping the monogram 5 times).
 * Copy is deliberately friendly and bilingual: if a guest opens it by accident, it must not scare them.
 */
export function StaffSheet() {
  const { t } = useI18n();
  const { sheetOpen, closeSheet, login } = useStaff();
  const [passcode, setPasscode] = useState("");
  const [remark, setRemark] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheetOpen) {
      const id = setTimeout(() => passRef.current?.focus(), 250);
      return () => clearTimeout(id);
    }
    // reset when closed
    /* eslint-disable react-hooks/set-state-in-effect -- clearing form state when the sheet closes */
    setPasscode("");
    setRemark("");
    setShow(false);
    setError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sheetOpen]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode || busy) return;
    setBusy(true);
    setError(false);
    const ok = await login(passcode, remark);
    setBusy(false);
    if (ok) closeSheet();
    else {
      setError(true);
      setPasscode("");
      passRef.current?.focus();
    }
  }

  return (
    <Sheet
      open={sheetOpen}
      onClose={closeSheet}
      title={t("staff.title")}
      closeLabel={t("staff.close")}
    >
      <p className="mb-5 text-[1.02rem] text-ink-soft">{t("staff.body")}</p>

      <form onSubmit={submit} className="space-y-4" autoComplete="off">
        <div>
          <label htmlFor="staff-pass" className="mb-1.5 block text-sm font-semibold text-forest">
            {t("staff.passcode")}
          </label>
          <div className="relative">
            <input
              id="staff-pass"
              ref={passRef}
              className="field pr-14"
              type={show ? "text" : "password"}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="go"
              aria-invalid={error}
              aria-describedby={error ? "staff-err" : undefined}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? t("staff.hide") : t("staff.show")}
              aria-pressed={show}
              className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-forest/70 active:bg-forest/10"
            >
              {show ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="staff-remark" className="mb-1.5 block text-sm font-semibold text-forest">
            {t("staff.remark")}
          </label>
          <input
            id="staff-remark"
            className="field"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={t("staff.remarkPlaceholder")}
            maxLength={80}
            autoComplete="off"
          />
        </div>

        {error && (
          <p id="staff-err" role="alert" className="text-[0.95rem] font-medium text-wine">
            {t("staff.wrong")}
          </p>
        )}

        <button type="submit" disabled={!passcode || busy} className="btn btn-primary w-full">
          {t("staff.unlock")}
        </button>
      </form>
    </Sheet>
  );
}
