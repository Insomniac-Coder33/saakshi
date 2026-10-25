import type { Metadata } from "next";
import { Verify } from "@/components/Verify";

// The one public page. It names Saakshi because an officer opens it, never her phone's home screen.
export const metadata: Metadata = {
  title: "Verify a file · Saakshi",
  description: "Check that a Saakshi recording is unchanged since it was captured, against its seal on Polygon.",
};

export default function Page() {
  return <Verify />;
}
