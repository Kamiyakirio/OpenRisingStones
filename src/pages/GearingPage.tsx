/** Native React workspace composition using the host navigation and theme. */
import { useState } from "react";
import { GearingWorkspace } from "../features/gearing/components/GearingWorkspace";
import { useGearingWorkspace } from "../features/gearing/hooks/useGearingWorkspace";
import "../features/gearing/styles/gearing.css";

type Props = { dark: boolean };
export function GearingPage({ dark }: Props) {
  const vm = useGearingWorkspace(dark);
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  return (
    <main className="gearing-workspace" aria-label="配装工作区">
      <header className="gearing-header">
        <h1>配装</h1>
        <div>
          <button
            type="button"
            disabled={!vm.store}
            onClick={() => setImportOpen((open) => !open)}
          >
            导入配装
          </button>
        </div>
      </header>
      {importOpen && (
        <form
          className="gearing-import"
          onSubmit={async (event) => {
            event.preventDefault();
            setImporting(true);
            setError("");
            try {
              await vm.importShare(input);
              setImportOpen(false);
              setInput("");
            } catch {
              setError(
                "导入失败，请检查分享码版本和装备数据。当前配装未被覆盖。",
              );
            } finally {
              setImporting(false);
            }
          }}
        >
          <label htmlFor="gear-share">分享码或完整分享链接</label>
          <input
            id="gear-share"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
          <button type="submit" disabled={importing}>
            {importing ? "正在导入" : "导入配装"}
          </button>
          <button type="button" onClick={() => setImportOpen(false)}>
            取消
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
      {vm.error && (
        <div className="gearing-error" role="alert">
          {vm.error}
          <button
            type="button"
            onClick={() => {
              if (window.confirm("清除配装草稿并重试？")) vm.reset();
            }}
          >
            清除配装草稿并重试
          </button>
        </div>
      )}
      {vm.store ? (
        <GearingWorkspace store={vm.store} />
      ) : (
        !vm.error && (
          <p className="gearing-loading" role="status">
            正在加载配装…
          </p>
        )
      )}
    </main>
  );
}
