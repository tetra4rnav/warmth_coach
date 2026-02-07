import { SessionRoom } from "@/components/session-room";

export default function SessionPage({ params }: { params: { id: string } }) {
  return <SessionRoom sessionId={params.id} />;
}
