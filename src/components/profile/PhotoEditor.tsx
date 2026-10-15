"use client";

import { useRef, useState } from "react";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useMyProfile } from "@/lib/profile/profileStore";
import { squareJpeg } from "@/lib/profile/photoUpload";
import { Avatar } from "./Avatar";

/** Your photo with Add / Change / Remove, and a preview before anything is uploaded. */
export function PhotoEditor({ size = "lg" }: { size?: "lg" | "xl" }) {
  const user = useCurrentUser();
  const { profile, uploadPhoto, removePhoto } = useMyProfile();
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await squareJpeg(file);
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError("We couldn't read that photo. Try a JPG or PNG.");
    }
  }

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function confirm() {
    if (!preview) return;
    setUploading(true);
    const result = await uploadPhoto(preview.blob);
    setUploading(false);
    if (!result.ok) setError(result.error);
    else clearPreview();
  }

  if (!user || !profile) return <div className={size === "xl" ? "h-28" : "h-20"} />;
  const verified = !!profile.verifiedAt;
  const box = size === "xl" ? "h-28 w-28" : "h-20 w-20";

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // A local preview (blob: URL) of the cropped photo before it's uploaded.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.url} alt="New profile photo preview" className={`${box} shrink-0 rounded-full object-cover`} />
      ) : (
        <Avatar name={user.name} photoId={profile.photoId} verified={verified} size={size} large />
      )}
      <div className="flex min-w-0 flex-col gap-2">
        {preview ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirm}
              disabled={uploading}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Use this photo"}
            </button>
            <button onClick={clearPreview} className="rounded-full border border-border px-4 py-1.5 text-xs text-foreground hover:bg-surface-2">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
            >
              {profile.photoId ? "Change photo" : "Add photo"}
            </button>
            {profile.photoId && (
              <button onClick={() => void removePhoto()} className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-danger">
                Remove
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-muted">
          {preview && verified
            ? "A new photo removes your ✓ badge until you verify again."
            : "A clear photo of your face. Only friends see it unless you choose otherwise."}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
    </div>
  );
}
