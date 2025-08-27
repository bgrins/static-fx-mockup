import { createFileRoute } from "@tanstack/react-router";
import { Browser } from "~/components/firefox/Browser";
import React from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage(): React.ReactElement {
  // Default Browser without any special configuration
  return <Browser />;
}
