import type { AnnouncementBase } from "@/types/address";
import type { RawAnnouncement } from "@/types/api";

let mockIdCounter = 1;

export function mockPopulateAnnouncement(announcement: AnnouncementBase): RawAnnouncement {
  return {
    ...announcement,
    id: (mockIdCounter++).toString(),
    createdAt: new Date().toString(),
    network_id: 1,
    networkFlavour: "evm" as const,
  };
}
