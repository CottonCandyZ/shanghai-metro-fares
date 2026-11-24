import { useEffect, useRef, useState } from "react"
import { Drawer } from "@base-ui/react/drawer"
import { Check, Copy, Download, Link2, Share, X } from "lucide-react"

const SHARE_FILENAME = "上海地铁票价对比.png"

interface ShareDialogProps {
  open: boolean
  imageUrl: string | null
  blob: Blob | null
  pageUrl: string
  onOpenChange: (open: boolean) => void
  onOpenChangeComplete?: (open: boolean) => void
}

export function ShareDialog({
  open,
  imageUrl,
  blob,
  pageUrl,
  onOpenChange,
  onOpenChangeComplete,
}: ShareDialogProps) {
  const [status, setStatus] = useState("")
  const [canCopyImage, setCanCopyImage] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setStatus("")
    if (!blob) {
      setCanCopyImage(false)
      setCanNativeShare(false)
      return
    }

    setCanCopyImage(
      typeof navigator.clipboard?.write === "function" &&
        typeof ClipboardItem !== "undefined"
    )

    let nativeSupported = false
    if (typeof navigator.canShare === "function" && typeof File !== "undefined") {
      try {
        const file = new File([blob], SHARE_FILENAME, { type: "image/png" })
        nativeSupported = navigator.canShare({ files: [file] })
      } catch {
        nativeSupported = false
      }
    }
    setCanNativeShare(nativeSupported)
  }, [open, blob])

  const handleDownload = () => {
    if (!imageUrl) return
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = SHARE_FILENAME
    document.body.append(link)
    link.click()
    link.remove()
    setStatus("已开始下载")
  }

  const handleCopyImage = async () => {
    if (!blob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      setStatus("已复制到剪贴板")
    } catch {
      setStatus("复制失败，请点击保存图片")
    }
  }

  const handleNativeShare = async () => {
    if (!blob) return
    try {
      const file = new File([blob], SHARE_FILENAME, { type: "image/png" })
      await navigator.share({ files: [file], title: "上海地铁票价对比" })
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        setStatus("分享失败，请点击保存图片")
      }
    }
  }

  const handleCopyLink = async () => {
    if (!pageUrl) return
    try {
      await navigator.clipboard.writeText(pageUrl)
      setStatus("已复制行程链接")
    } catch {
      linkInputRef.current?.focus()
      linkInputRef.current?.select()
      setStatus("已选中链接，可手动复制")
    }
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="share-backdrop" />
        <Drawer.Viewport className="share-viewport">
          <Drawer.Popup className="share-dialog">
            <div className="share-dialog-head">
              <Drawer.Title className="share-dialog-title">分享图预览</Drawer.Title>
              <Drawer.Close className="share-close" aria-label="关闭分享预览">
                <X size={17} strokeWidth={2.1} aria-hidden="true" />
              </Drawer.Close>
            </div>

            <Drawer.Content className="share-dialog-content">
              <div className="share-preview-wrap">
                {imageUrl && (
                  <img
                    className="share-preview-img"
                    src={imageUrl}
                    alt="上海地铁票价对比分享图，底部二维码可打开计算器"
                  />
                )}
              </div>

              <div className="share-dialog-foot">
                <p className="share-tip">长按图片或点击下方按钮保存与分享</p>
                <div className="share-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleDownload}
                  >
                    <Download size={15} strokeWidth={2.1} aria-hidden="true" />
                    <span>保存图片</span>
                  </button>
                  {canCopyImage && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCopyImage}
                    >
                      <Copy size={15} strokeWidth={2} aria-hidden="true" />
                      <span>复制图片</span>
                    </button>
                  )}
                  {canNativeShare && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleNativeShare}
                    >
                      <Share size={15} strokeWidth={2} aria-hidden="true" />
                      <span>系统分享</span>
                    </button>
                  )}
                </div>

                <div className="share-link-row">
                  <input
                    ref={linkInputRef}
                    type="url"
                    aria-label="行程分享网址"
                    value={pageUrl}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCopyLink}
                  >
                    <Link2 size={15} strokeWidth={2} aria-hidden="true" />
                    <span>分享链接</span>
                  </button>
                </div>

                {status && (
                  <p className="share-status" role="status" aria-live="polite">
                    <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                    <span>{status}</span>
                  </p>
                )}
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
