import { redirect } from "next/navigation";

// Content discovery has been deprecated in favor of the accountability-focused experience.
// Redirect users to the home feed.
export default function Discover() {
  redirect("/");
}
