/** Recruitment-specific content rendered through the shared risk dialog. */
import { RiskDialog } from "../shared/components/RiskDialog";

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
      title="使用高级筛选前请确认风险"
      items={[
        "本功能将涉及对石之家 API 的高频率自动化请求。",
        "虽然已在代码中加入频控，但仍然可能有无法预见的后果。",
        "使用该功能默认已知晓一切可能后果。",
      ]}
      confirmLabel="同意并初始化"
      storageError={storageError}
      onConfirm={onAgree}
      onCancel={onCancel}
    />
  );
}
