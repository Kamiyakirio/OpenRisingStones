/** Recruitment-specific content rendered through the shared risk dialog. */
import { RiskDialog } from "../../../shared/components/RiskDialog";

type AdvancedRecruitRiskDialogProps = {
  storageError: boolean;
  onAgree: () => void;
  onCancel: () => void;
};

export function AdvancedRecruitRiskDialog({
  storageError,
  onAgree,
  onCancel,
}: AdvancedRecruitRiskDialogProps) {
  return (
    <RiskDialog
      title="高级筛选会发起较多请求"
      items={[
        "高级筛选会自动读取多页招募列表与详情，请求量高于普通招募列表。",
        "应用会限制请求频率，但石之家仍可能触发访问限制。",
        "出现访问限制后，应用会暂停请求并等待自动重试。",
      ]}
      confirmLabel="确认并加载"
      storageError={storageError}
      onConfirm={onAgree}
      onCancel={onCancel}
    />
  );
}
