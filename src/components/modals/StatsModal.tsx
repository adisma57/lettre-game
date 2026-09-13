import { Modal } from "../ui/Modal";
import { StatsPanel } from "../game/StatsPanel";

export function StatsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Statistiques" onClose={onClose}>
      <StatsPanel />
    </Modal>
  );
}
