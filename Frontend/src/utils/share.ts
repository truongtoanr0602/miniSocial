import { toast } from "sonner";

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export async function sharePostLink(postId: string, text = "Xem bài viết này trên Social Mini") {
  const url = new URL(window.location.origin);
  url.searchParams.set("post", postId);
  const shareUrl = url.toString();

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Social Mini",
        text,
        url: shareUrl,
      });
      return;
    } catch (error: any) {
      if (error?.name === "AbortError") return;
    }
  }

  await copyToClipboard(shareUrl);
  toast.success("Đã sao chép liên kết bài viết.");
}

export async function copyProfileLink(userId: string) {
  const url = new URL(window.location.origin);
  url.searchParams.set("profile", userId);
  await copyToClipboard(url.toString());
  toast.success("Đã sao chép liên kết hồ sơ.");
}

export async function copyText(value: string, successMessage: string) {
  await copyToClipboard(value);
  toast.success(successMessage);
}
