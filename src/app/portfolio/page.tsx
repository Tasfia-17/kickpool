import React from "react";
import PortfolioClient from "./PortfolioClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio | CinePurr",
  description: "Graphic & Motion Designer Portfolio.",
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
