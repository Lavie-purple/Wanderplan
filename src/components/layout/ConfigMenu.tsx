import { useState } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

/** Key 半隐藏展示：45c5•••••••32d */
function maskKey(key: string): string {
  if (!key) return '未配置'
  if (key.length <= 8) return key.slice(0, 2) + '••••'
  return key.slice(0, 4) + '•••••••' + key.slice(-3)
}

export default function ConfigMenu() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const tiandituKey = useAppStore((s) => s.tiandituKey)
  const setTiandituKey = useAppStore((s) => s.setTiandituKey)

  const isConfigured = tiandituKey !== ''

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="配置"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-moss-pale hover:text-moss sm:h-9 sm:w-9"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-[2000] w-80 rounded-xl border border-line bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">配置</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ink-soft transition hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>

          <p className="mt-3 text-xs font-medium text-ink">境外中文标注（天地图 Key）</p>
          {!editing ? (
            <>
              <div
                className="mt-2 flex items-center gap-2 rounded-lg bg-cream px-2.5 py-2"
                title={tiandituKey}
              >
                <code className="flex-1 truncate text-ink-soft">{maskKey(tiandituKey)}</code>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                    !isConfigured ? 'bg-moss-pale text-moss' : 'bg-apricot-pale text-[#b07a4a]'
                  }`}
                >
                  {!isConfigured ? '内置默认' : '自定义'}
                </span>
              </div>
              <p className="mt-2 leading-relaxed text-ink-soft/80">
                用于境外地图的中文标注。Key 仅保存在你浏览器本地，不会上传/入库；未配置时境外自动使用英文 CARTO 底图（境内高德不受影响）。
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(tiandituKey)
                    setEditing(true)
                  }}
                  className="flex-1 rounded-lg bg-moss py-1.5 font-medium text-white transition hover:bg-moss-light"
                >
                  更换 Key
                </button>
                {isConfigured && (
                  <button
                    type="button"
                    onClick={() => setTiandituKey('')}
                    className="rounded-lg border border-line px-3 py-1.5 text-ink-soft transition hover:text-ink"
                  >
                    清除
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <input
                type="password"
                autoComplete="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="粘贴新的天地图 Key"
                autoFocus
                className="mt-2 w-full rounded-lg border border-line bg-cream px-2.5 py-2 outline-none focus:border-moss/50"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTiandituKey(draft.trim())
                    setEditing(false)
                  }}
                  className="flex-1 rounded-lg bg-moss py-1.5 font-medium text-white transition hover:bg-moss-light"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-ink-soft transition hover:text-ink"
                >
                  取消
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
