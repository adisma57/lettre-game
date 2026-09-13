import { Modal } from "../ui/Modal";
import { t } from "../../language";
import { StatsPanel } from "../game/StatsPanel";

export function StatsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title={t("Statistiques", "Statistics")} onClose={onClose}>
      <StatsPanel />
    </Modal>
  );
}
